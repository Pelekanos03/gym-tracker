import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coaching } from '../domain/coaching.entity';
import { User } from '../domain/user.entity';
import { CoachingStatus } from '../common/enums';
import { UsersService } from '../users/users.service';
import { FriendshipService } from '../friendship/friendship.service';

@Injectable()
export class CoachingService {
  constructor(
    @InjectRepository(Coaching)
    private readonly coachings: Repository<Coaching>,
    private readonly users: UsersService,
    private readonly friendship: FriendshipService,
  ) {}

  /**
   * A friend asks to become someone's coach. Requires an existing accepted
   * friendship — coaching is an upgrade on top of that, not a separate
   * connection you can request out of nowhere.
   */
  async request(coachId: string, clientId: string): Promise<Coaching> {
    if (coachId === clientId) {
      throw new BadRequestException("You can't coach yourself");
    }
    const coach = await this.users.findById(coachId);
    const client = await this.users.findById(clientId);
    await this.friendship.assertFriends(coach.id, client.id);

    const existing = await this.coachings.findOne({
      where: { coach: { id: coach.id }, client: { id: client.id } },
    });
    if (existing) {
      throw new ConflictException(
        existing.status === CoachingStatus.ACCEPTED
          ? 'Already coaching this person'
          : 'Coaching request already sent',
      );
    }

    const request = this.coachings.create({ coach, client, status: CoachingStatus.PENDING });
    return this.coachings.save(request);
  }

  /** Only the prospective client may accept or decline a coaching request. */
  async respond(coachingId: string, userId: string, accept: boolean): Promise<Coaching> {
    const coaching = await this.findOrThrow(coachingId);
    if (coaching.client.id !== userId) {
      throw new ForbiddenException('Only the prospective client can respond to this request');
    }
    if (!accept) {
      await this.coachings.remove(coaching);
      return coaching;
    }
    coaching.status = CoachingStatus.ACCEPTED;
    coaching.respondedAt = new Date();
    return this.coachings.save(coaching);
  }

  /** Either the coach or the client can end an active coaching link. */
  async revoke(coachingId: string, userId: string): Promise<void> {
    const coaching = await this.findOrThrow(coachingId);
    if (coaching.coach.id !== userId && coaching.client.id !== userId) {
      throw new ForbiddenException("That coaching link doesn't involve this user");
    }
    await this.coachings.remove(coaching);
  }

  incomingRequests(clientId: string): Promise<Coaching[]> {
    return this.coachings.find({
      where: { client: { id: clientId }, status: CoachingStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  outgoingRequests(coachId: string): Promise<Coaching[]> {
    return this.coachings.find({
      where: { coach: { id: coachId }, status: CoachingStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  /** Everyone accepted-coaching this user, with the link id (needed to end it). */
  async coachesOf(clientId: string): Promise<{ coachingId: string; coach: User }[]> {
    const rows = await this.coachings.find({
      where: { client: { id: clientId }, status: CoachingStatus.ACCEPTED },
    });
    return rows.map((r) => ({ coachingId: r.id, coach: r.coach }));
  }

  /** Everyone this user accepted-coaches, with the link id (needed to end it). */
  async clientsOf(coachId: string): Promise<{ coachingId: string; client: User }[]> {
    const rows = await this.coachings.find({
      where: { coach: { id: coachId }, status: CoachingStatus.ACCEPTED },
    });
    return rows.map((r) => ({ coachingId: r.id, client: r.client }));
  }

  /** Guard used by other services: throws unless coachId accepted-coaches clientId. Direction matters — this is not symmetric like friendship. */
  async assertCoach(coachId: string, clientId: string): Promise<void> {
    const link = await this.coachings.findOne({
      where: {
        coach: { id: coachId },
        client: { id: clientId },
        status: CoachingStatus.ACCEPTED,
      },
    });
    if (!link) throw new NotFoundException('Not an accepted coach of that user');
  }

  private async findOrThrow(coachingId: string): Promise<Coaching> {
    const coaching = await this.coachings.findOne({ where: { id: coachingId } });
    if (!coaching) throw new NotFoundException('Coaching link not found');
    return coaching;
  }
}
