import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship } from '../domain/friendship.entity';
import { User } from '../domain/user.entity';
import { FriendshipStatus } from '../common/enums';
import { UsersService } from '../users/users.service';

@Injectable()
export class FriendshipService {
  constructor(
    @InjectRepository(Friendship)
    private readonly friendships: Repository<Friendship>,
    private readonly users: UsersService,
  ) {}

  /**
   * Sends a friend request. If the other user already sent one to us, this
   * accepts it instead of creating a duplicate — a mutual "add" just works.
   */
  async sendRequest(fromUserId: string, toUserId: string): Promise<Friendship> {
    if (fromUserId === toUserId) {
      throw new BadRequestException("You can't friend yourself");
    }
    const from = await this.users.findById(fromUserId);
    const to = await this.users.findById(toUserId);

    if (await this.findAccepted(from.id, to.id)) {
      throw new ConflictException('Already friends');
    }

    const reverse = await this.friendships.findOne({
      where: {
        requester: { id: to.id },
        addressee: { id: from.id },
        status: FriendshipStatus.PENDING,
      },
    });
    if (reverse) {
      reverse.status = FriendshipStatus.ACCEPTED;
      reverse.respondedAt = new Date();
      return this.friendships.save(reverse);
    }

    const existing = await this.friendships.findOne({
      where: {
        requester: { id: from.id },
        addressee: { id: to.id },
        status: FriendshipStatus.PENDING,
      },
    });
    if (existing) return existing;

    const request = this.friendships.create({
      requester: from,
      addressee: to,
      status: FriendshipStatus.PENDING,
    });
    return this.friendships.save(request);
  }

  /** Accept or decline a pending request. Only the addressee may respond. */
  async respond(
    friendshipId: string,
    userId: string,
    accept: boolean,
  ): Promise<Friendship> {
    const request = await this.findOrThrow(friendshipId);
    if (request.addressee.id !== userId) {
      throw new ForbiddenException('Only the recipient can respond to this request');
    }
    if (!accept) {
      await this.friendships.remove(request);
      return request;
    }
    request.status = FriendshipStatus.ACCEPTED;
    request.respondedAt = new Date();
    return this.friendships.save(request);
  }

  /** Either party can end an accepted friendship. */
  async unfriend(friendshipId: string, userId: string): Promise<void> {
    const friendship = await this.findOrThrow(friendshipId);
    if (friendship.requester.id !== userId && friendship.addressee.id !== userId) {
      throw new ForbiddenException("That friendship doesn't involve this user");
    }
    await this.friendships.remove(friendship);
  }

  async friendsOf(
    userId: string,
  ): Promise<{ friendshipId: string; since: Date; friend: User }[]> {
    const asRequester = await this.friendships.find({
      where: { requester: { id: userId }, status: FriendshipStatus.ACCEPTED },
    });
    const asAddressee = await this.friendships.find({
      where: { addressee: { id: userId }, status: FriendshipStatus.ACCEPTED },
    });
    return [
      ...asRequester.map((f) => ({
        friendshipId: f.id,
        since: f.respondedAt ?? f.createdAt,
        friend: f.addressee,
      })),
      ...asAddressee.map((f) => ({
        friendshipId: f.id,
        since: f.respondedAt ?? f.createdAt,
        friend: f.requester,
      })),
    ];
  }

  incomingRequests(userId: string): Promise<Friendship[]> {
    return this.friendships.find({
      where: { addressee: { id: userId }, status: FriendshipStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  outgoingRequests(userId: string): Promise<Friendship[]> {
    return this.friendships.find({
      where: { requester: { id: userId }, status: FriendshipStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  /** Guard used by other services: throws unless the two users are friends. */
  async assertFriends(userAId: string, userBId: string): Promise<void> {
    if (userAId === userBId) return;
    if (!(await this.findAccepted(userAId, userBId))) {
      throw new NotFoundException('Not friends with that user');
    }
  }

  private async findAccepted(
    userAId: string,
    userBId: string,
  ): Promise<Friendship | null> {
    return (
      (await this.friendships.findOne({
        where: {
          requester: { id: userAId },
          addressee: { id: userBId },
          status: FriendshipStatus.ACCEPTED,
        },
      })) ??
      (await this.friendships.findOne({
        where: {
          requester: { id: userBId },
          addressee: { id: userAId },
          status: FriendshipStatus.ACCEPTED,
        },
      }))
    );
  }

  private async findOrThrow(friendshipId: string): Promise<Friendship> {
    const friendship = await this.friendships.findOne({ where: { id: friendshipId } });
    if (!friendship) throw new NotFoundException('Friendship not found');
    return friendship;
  }
}
