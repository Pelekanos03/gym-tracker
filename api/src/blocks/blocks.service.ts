import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockStatus } from '../common/enums';
import { TrainingBlock } from '../domain/training-block.entity';
import { UsersService } from '../users/users.service';
import { ProgramsService } from '../programs/programs.service';
import { ProgramShareService } from '../programs/program-share.service';

/** What the client gets back for a block: the block itself plus its computed progress. */
export interface BlockView {
  id: string;
  status: BlockStatus;
  startedOn: string;
  endedOn: string | null;
  program: { id: string; name: string; owner: { id: string; name: string } };
  days: ReturnType<TrainingBlock['progress']>;
  next: ReturnType<TrainingBlock['nextDay']>;
}

@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(TrainingBlock)
    private readonly blocks: Repository<TrainingBlock>,
    private readonly users: UsersService,
    private readonly programs: ProgramsService,
    private readonly shares: ProgramShareService,
  ) {}

  /**
   * Starts running a program. A user runs one block at a time, so any block
   * still active is finished first.
   */
  async start(userId: string, programId: string): Promise<BlockView> {
    const user = await this.users.findById(userId);
    const program = await this.programs.findById(programId);
    if (program.owner.id !== userId) {
      const shared = await this.shares.sharedWithMe(userId);
      if (!shared.some((p) => p.id === programId)) {
        throw new ForbiddenException('You can only run your own programs or ones shared with you');
      }
    }

    const current = await this.findActive(userId);
    if (current) await this.finish(current);

    const block = this.blocks.create({
      user,
      program,
      startedOn: today(),
      endedOn: null,
      sessions: [],
    });
    return this.toView(await this.blocks.save(block));
  }

  /** The user's current block, or null when they aren't running one. */
  async active(userId: string): Promise<BlockView | null> {
    const block = await this.findActive(userId);
    return block ? this.toView(block) : null;
  }

  async end(blockId: string, userId: string): Promise<BlockView> {
    const block = await this.findOwned(blockId, userId);
    await this.finish(block);
    return this.toView(block);
  }

  /** Used when logging a session against a block: it must be yours and still running. */
  async findActiveOwned(blockId: string, userId: string): Promise<TrainingBlock> {
    const block = await this.findOwned(blockId, userId);
    if (block.status !== BlockStatus.ACTIVE) {
      throw new ForbiddenException('That block has already been finished');
    }
    return block;
  }

  private findActive(userId: string): Promise<TrainingBlock | null> {
    return this.blocks.findOne({
      where: { user: { id: userId }, status: BlockStatus.ACTIVE },
      relations: { sessions: true },
    });
  }

  private async findOwned(blockId: string, userId: string): Promise<TrainingBlock> {
    const block = await this.blocks.findOne({
      where: { id: blockId },
      relations: { sessions: true },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (block.user.id !== userId) throw new ForbiddenException('That block is not yours');
    return block;
  }

  private async finish(block: TrainingBlock): Promise<void> {
    block.status = BlockStatus.FINISHED;
    block.endedOn = today();
    await this.blocks.save(block);
  }

  private toView(block: TrainingBlock): BlockView {
    const { program } = block;
    return {
      id: block.id,
      status: block.status,
      startedOn: block.startedOn,
      endedOn: block.endedOn,
      program: {
        id: program.id,
        name: program.name,
        owner: { id: program.owner.id, name: program.owner.name },
      },
      days: block.progress(),
      next: block.nextDay(),
    };
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
