import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program } from '../domain/program.entity';
import { ProgramShare } from '../domain/program-share.entity';
import { UsersService } from '../users/users.service';
import { FriendshipService } from '../friendship/friendship.service';

@Injectable()
export class ProgramShareService {
  constructor(
    @InjectRepository(Program)
    private readonly programs: Repository<Program>,
    @InjectRepository(ProgramShare)
    private readonly shares: Repository<ProgramShare>,
    private readonly users: UsersService,
    private readonly friendship: FriendshipService,
  ) {}

  /**
   * Shares a program with a friend: they can see it and log workouts
   * against it, but it stays yours — nothing is copied. This is the
   * replacement for the old "copy a friend's program" flow, which let
   * anyone walk off with an independent, freely-editable clone of a
   * program someone may have paid a coach for.
   */
  async share(programId: string, ownerId: string, friendId: string): Promise<ProgramShare> {
    const program = await this.findProgramOrThrow(programId);
    if (program.owner.id !== ownerId) {
      throw new ForbiddenException('Only the owner can share this program');
    }
    const friend = await this.users.findById(friendId);
    await this.friendship.assertFriends(ownerId, friend.id);

    const existing = await this.shares.findOne({
      where: { program: { id: program.id }, sharedWith: { id: friend.id } },
    });
    if (existing) throw new ConflictException('Already shared with that friend');

    const share = this.shares.create({ program, sharedWith: friend });
    return this.shares.save(share);
  }

  async unshare(programId: string, ownerId: string, friendId: string): Promise<void> {
    const program = await this.findProgramOrThrow(programId);
    if (program.owner.id !== ownerId) {
      throw new ForbiddenException('Only the owner can unshare this program');
    }
    const share = await this.shares.findOne({
      where: { program: { id: program.id }, sharedWith: { id: friendId } },
    });
    if (!share) return;
    await this.shares.remove(share);
  }

  /** Who a program is currently shared with (for the owner to manage). */
  async sharesFor(programId: string): Promise<ProgramShare[]> {
    return this.shares.find({ where: { program: { id: programId } } });
  }

  /** Programs friends have shared with this user — usable for logging, not owned. */
  async sharedWithMe(userId: string): Promise<Program[]> {
    const rows = await this.shares.find({ where: { sharedWith: { id: userId } } });
    return rows.map((r) => r.program);
  }

  private async findProgramOrThrow(id: string): Promise<Program> {
    const program = await this.programs.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }
}
