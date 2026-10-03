import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { Message } from '../domain/message.entity';
import { FriendshipService } from '../friendship/friendship.service';
import { CoachingService } from '../coaching/coaching.service';
import { toOtherUser, type OtherUser } from '../users/user.view';
import { attachmentPath, removeAttachmentFile } from '../common/uploads';

export type Relation = 'friend' | 'coach' | 'client';

export interface Contact {
  user: OtherUser;
  /** How you know them: a friend, your coach, or someone you coach (several can apply). */
  relations: Relation[];
  last: { body: string; createdAt: Date; fromMe: boolean } | null;
  unread: number;
}

/** Plain shape sent to the app — no nested user objects, and never the file's name on disk. */
function view(m: Message) {
  return {
    id: m.id,
    fromId: m.senderId,
    toId: m.recipientId,
    body: m.body,
    createdAt: m.createdAt,
    readAt: m.readAt,
    attachment: m.attachmentFile
      ? { name: m.attachmentName ?? 'file', type: m.attachmentType ?? 'application/octet-stream', size: m.attachmentSize ?? 0 }
      : null,
  };
}

/** What the contact list shows for a message: its text, or the file it carried. */
function preview(m: Message): string {
  return m.body || (m.attachmentFile ? `📎 ${m.attachmentName ?? 'File'}` : '');
}

export interface UploadedAttachment {
  /** Stored name on disk. */
  file: string;
  name: string;
  type: string;
  size: number;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    private readonly friendship: FriendshipService,
    private readonly coaching: CoachingService,
  ) {}

  /** Everyone you can chat with — friends, your coaches, your clients — with the latest message and unread count. */
  async contacts(me: string): Promise<Contact[]> {
    const [friends, coaches, clients] = await Promise.all([
      this.friendship.friendsOf(me),
      this.coaching.coachesOf(me),
      this.coaching.clientsOf(me),
    ]);
    const byId = new Map<string, Contact>();
    const add = (user: { id: string; name: string }, relation: Relation) => {
      const c = byId.get(user.id) ?? { user: { id: user.id, name: user.name }, relations: [], last: null, unread: 0 };
      if (!c.relations.includes(relation)) c.relations.push(relation);
      byId.set(user.id, c);
    };
    friends.forEach((f) => add(f.friend, 'friend'));
    coaches.forEach((c) => add(c.coach, 'coach'));
    clients.forEach((c) => add(c.client, 'client'));

    await Promise.all(
      [...byId.values()].map(async (c) => {
        const other = c.user.id;
        const last = await this.thread(me, other).orderBy('m.createdAt', 'DESC').getOne();
        c.last = last ? { body: preview(last), createdAt: last.createdAt, fromMe: last.senderId === me } : null;
        c.unread = await this.messages.count({ where: { senderId: other, recipientId: me, readAt: IsNull() } });
      }),
    );
    return [...byId.values()].sort(
      (a, b) =>
        (b.last ? +new Date(b.last.createdAt) : 0) - (a.last ? +new Date(a.last.createdAt) : 0) ||
        a.user.name.localeCompare(b.user.name),
    );
  }

  /**
   * A page of the conversation, oldest → newest (up to `limit`, before
   * `before` for scrolling back). Opening it marks their messages read.
   */
  async conversation(me: string, other: string, before?: string, limit = 50) {
    await this.assertCanChat(me, other);
    const q = this.thread(me, other).orderBy('m.createdAt', 'DESC').take(Math.min(limit, 100));
    if (before) q.andWhere('m.createdAt < :before', { before: new Date(before) });
    const page = (await q.getMany()).reverse();
    await this.messages.update({ senderId: other, recipientId: me, readAt: IsNull() }, { readAt: new Date() });
    return page.map(view);
  }

  async send(me: string, to: string, body: string) {
    await this.assertCanChat(me, to);
    const saved = await this.messages.save(this.messages.create({ senderId: me, recipientId: to, body: body.trim() }));
    return view(saved);
  }

  /** A message carrying a file (already saved to disk), with optional text. */
  async sendAttachment(me: string, to: string, body: string, file: UploadedAttachment) {
    let name: string;
    try {
      await this.assertCanChat(me, to);
      name = cleanFileName(file.name);
    } catch (err) {
      await removeAttachmentFile(file.file);
      throw err;
    }
    const saved = await this.messages.save(
      this.messages.create({
        senderId: me,
        recipientId: to,
        body: body.trim(),
        attachmentFile: file.file,
        attachmentName: name,
        attachmentType: file.type,
        attachmentSize: file.size,
      }),
    );
    return view(saved);
  }

  /** The file sent with a message — only for the two people in that chat. */
  async attachmentFor(messageId: string, me: string) {
    const m = await this.messages.findOne({ where: { id: messageId } });
    if (!m?.attachmentFile || (m.senderId !== me && m.recipientId !== me)) {
      throw new NotFoundException('File not found');
    }
    return {
      path: attachmentPath(m.attachmentFile),
      name: m.attachmentName ?? 'file',
      type: m.attachmentType ?? 'application/octet-stream',
    };
  }

  /** For the badge on "Messages". */
  async unreadCount(me: string): Promise<number> {
    return this.messages.count({ where: { recipientId: me, readAt: IsNull() } });
  }

  private thread(a: string, b: string) {
    return this.messages
      .createQueryBuilder('m')
      .where(
        new Brackets((w) =>
          w
            .where('(m.senderId = :a AND m.recipientId = :b)')
            .orWhere('(m.senderId = :b AND m.recipientId = :a)'),
        ),
      )
      .setParameters({ a, b });
  }

  /** Friends, or coach and client (either way round). Anyone else: no. */
  private async assertCanChat(me: string, other: string): Promise<void> {
    if (me === other) throw new ForbiddenException("You can't message yourself");
    const ok =
      (await this.friendship.assertFriends(me, other).then(() => true, () => false)) ||
      (await this.coaching.assertCoach(me, other).then(() => true, () => false)) ||
      (await this.coaching.assertCoach(other, me).then(() => true, () => false));
    if (!ok) throw new ForbiddenException('You can only message friends and your coach or clients');
  }
}

/** A display name safe to put in a download header: no paths or control characters, sensible length. */
function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f"]/g, '').trim().slice(-120);
  if (!clean) throw new BadRequestException('That file has no name');
  return clean;
}
