import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutSession } from '../domain/workout-session.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { SetLog } from '../domain/set-log.entity';
import { SetDrop } from '../domain/set-drop.entity';
import { SupersetPartner } from '../domain/superset-partner.entity';
import { SetType } from '../common/enums';
import { UsersService } from '../users/users.service';
import { ExercisesService } from '../exercises/exercises.service';
import { CoachingService } from '../coaching/coaching.service';
import { BlocksService } from '../blocks/blocks.service';
import { LogSessionDto, SetLogInput } from './dto/log-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class WorkoutsService {
  constructor(
    @InjectRepository(WorkoutSession)
    private readonly sessions: Repository<WorkoutSession>,
    @InjectRepository(ProgramDay)
    private readonly programDays: Repository<ProgramDay>,
    @InjectRepository(SetLog)
    private readonly setLogs: Repository<SetLog>,
    private readonly users: UsersService,
    private readonly exercises: ExercisesService,
    private readonly coaching: CoachingService,
    private readonly blocks: BlocksService,
  ) {}

  /** A user records a training session and all the sets they did. */
  async log(dto: LogSessionDto): Promise<WorkoutSession> {
    const user = await this.users.findById(dto.userId);

    const session = new WorkoutSession();
    session.user = user;
    session.date = dto.date;
    if (dto.status) session.status = dto.status;
    session.notes = dto.notes ?? '';
    session.programDay = await this.resolveProgramDay(dto.programDayId);
    session.sets = await this.buildSets(dto.sets);

    if (dto.blockId) {
      const block = await this.blocks.findActiveOwned(dto.blockId, dto.userId);
      const day = session.programDay;
      if (!day || !block.program.days.some((d) => d.id === day.id)) {
        throw new BadRequestException("Pick a day from the block's program to log it to the block");
      }
      session.block = block;
      session.blockWeek = day.weekNumber;
      session.blockDay = day.dayNumber;
    }

    return this.sessions.save(session);
  }

  /** A user's own training history. */
  historyForUser(userId: string): Promise<WorkoutSession[]> {
    return this.sessions.find({
      where: { user: { id: userId } },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<WorkoutSession> {
    const session = await this.sessions.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /**
   * Coach view: "see what my client did". Despite the URL shape (kept for
   * continuity with the rest of the friends API), this now requires an
   * accepted *coaching* link, not just friendship — a plain friend only
   * gets progress, not full session detail. See ProgressService for that.
   */
  async historyForFriend(
    viewerId: string,
    friendId: string,
  ): Promise<WorkoutSession[]> {
    await this.coaching.assertCoach(viewerId, friendId);
    return this.historyForUser(friendId);
  }

  /**
   * Replaces a session's date/notes/status/programDay and its full set of
   * logged sets. Only the user who logged it may edit it.
   */
  async update(sessionId: string, dto: UpdateSessionDto): Promise<WorkoutSession> {
    const session = await this.findById(sessionId);
    if (session.user.id !== dto.userId) {
      throw new ForbiddenException('Only the user who logged this session can edit it');
    }

    session.date = dto.date;
    if (dto.status) session.status = dto.status;
    session.notes = dto.notes ?? '';
    session.programDay = await this.resolveProgramDay(dto.programDayId);

    if (session.sets.length > 0) {
      await this.setLogs.remove(session.sets);
    }
    session.sets = await this.buildSets(dto.sets);

    return this.sessions.save(session);
  }

  /** Only the user who logged a session may delete it. */
  async delete(sessionId: string, userId: string): Promise<void> {
    const session = await this.findById(sessionId);
    if (session.user.id !== userId) {
      throw new ForbiddenException('Only the user who logged this session can delete it');
    }
    await this.sessions.remove(session);
  }

  private async resolveProgramDay(programDayId?: string): Promise<ProgramDay | null> {
    if (!programDayId) return null;
    const day = await this.programDays.findOne({ where: { id: programDayId } });
    if (!day) throw new NotFoundException('Program day not found');
    return day;
  }

  private async buildSets(setInputs: SetLogInput[]): Promise<SetLog[]> {
    const byId = await this.exercises.findManyByIds([
      ...new Set(
        setInputs.flatMap((s) => [
          s.exerciseId,
          ...(s.supersetPartners ?? []).map((p) => p.exerciseId),
        ]),
      ),
    ]);
    return setInputs.map((setInput) => {
      const set = new SetLog();
      set.exercise = byId.get(setInput.exerciseId)!;
      set.setNumber = setInput.setNumber;
      set.weight = setInput.weight;
      set.reps = setInput.reps;
      set.rpe = setInput.rpe ?? null;
      set.setType = setInput.setType ?? SetType.WORKING;
      set.drops =
        set.setType === SetType.DROP_SET
          ? (setInput.drops ?? []).map((dropInput, i) => {
              const drop = new SetDrop();
              drop.orderIndex = i + 1;
              drop.weight = dropInput.weight;
              drop.reps = dropInput.reps;
              return drop;
            })
          : [];
      set.supersetPartners =
        set.setType === SetType.SUPERSET
          ? (setInput.supersetPartners ?? []).map((partnerInput, i) => {
              const partner = new SupersetPartner();
              partner.exercise = byId.get(partnerInput.exerciseId)!;
              partner.orderIndex = i + 1;
              partner.weight = partnerInput.weight;
              partner.reps = partnerInput.reps;
              return partner;
            })
          : [];
      return set;
    });
  }
}
