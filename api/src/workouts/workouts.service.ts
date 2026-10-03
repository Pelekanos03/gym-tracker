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
import { removeVideoFile, videoPath } from '../common/uploads';
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

  /** A session is visible to the lifter and their accepted coach; anyone else gets a 404. */
  async findVisible(id: string, viewerId: string): Promise<WorkoutSession> {
    const session = await this.findById(id);
    await this.assertCanWatch(session.user.id, viewerId);
    return session;
  }

  /**
   * Path of a set's video on disk, if `viewerId` may watch it: the lifter
   * themself or their accepted coach. Friends can't — videos are private.
   */
  async videoPathFor(setId: string, viewerId: string): Promise<string> {
    const set = await this.setLogs.findOne({
      where: { id: setId },
      relations: { session: { user: true } },
    });
    if (!set?.videoFile) throw new NotFoundException('Video not found');
    await this.assertCanWatch(set.session.user.id, viewerId);
    return videoPath(set.videoFile);
  }

  private async assertCanWatch(ownerId: string, viewerId: string): Promise<void> {
    if (ownerId === viewerId) return;
    await this.coaching.assertCoach(viewerId, ownerId).catch(() => {
      throw new NotFoundException('Not found');
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

    const oldVideos = new Set(session.sets.map((s) => s.videoFile).filter((f): f is string => !!f));
    if (session.sets.length > 0) {
      await this.setLogs.remove(session.sets);
    }
    session.sets = await this.buildSets(dto.sets, oldVideos);

    const saved = await this.sessions.save(session);
    const kept = new Set(saved.sets.map((s) => s.videoFile));
    await Promise.all([...oldVideos].filter((f) => !kept.has(f)).map(removeVideoFile));
    return saved;
  }

  /** Only the user who logged a session may delete it. */
  async delete(sessionId: string, userId: string): Promise<void> {
    const session = await this.findById(sessionId);
    if (session.user.id !== userId) {
      throw new ForbiddenException('Only the user who logged this session can delete it');
    }
    const videos = session.sets.map((s) => s.videoFile);
    await this.sessions.remove(session);
    await Promise.all(videos.map(removeVideoFile));
  }

  /** Attaches (or replaces) the video of one set. Only its lifter may. */
  async attachVideo(setId: string, userId: string, file: string): Promise<SetLog> {
    let set: SetLog;
    try {
      set = await this.findOwnedSet(setId, userId);
    } catch (err) {
      await removeVideoFile(file);
      throw err;
    }
    const previous = set.videoFile;
    await this.setLogs.update(set.id, { videoFile: file });
    await removeVideoFile(previous);
    set.videoFile = file;
    return set;
  }

  async removeVideo(setId: string, userId: string): Promise<void> {
    const set = await this.findOwnedSet(setId, userId);
    await this.setLogs.update(set.id, { videoFile: null, videoNote: null });
    await removeVideoFile(set.videoFile);
  }

  /** The lifter adds, changes or clears the comment on their set's video. */
  async setVideoNote(setId: string, userId: string, note: string): Promise<SetLog> {
    const set = await this.findOwnedSet(setId, userId);
    if (!set.videoFile) throw new BadRequestException('Add a video to this set first');
    set.videoNote = note.trim() || null;
    await this.setLogs.update(set.id, { videoNote: set.videoNote });
    return set;
  }

  private async findOwnedSet(setId: string, userId: string): Promise<SetLog> {
    const set = await this.setLogs.findOne({
      where: { id: setId },
      relations: { session: { user: true } },
    });
    if (!set) throw new NotFoundException('Set not found');
    if (set.session.user.id !== userId) {
      throw new ForbiddenException('Only the user who logged this set can change its video');
    }
    return set;
  }

  private async resolveProgramDay(programDayId?: string): Promise<ProgramDay | null> {
    if (!programDayId) return null;
    const day = await this.programDays.findOne({ where: { id: programDayId } });
    if (!day) throw new NotFoundException('Program day not found');
    return day;
  }

  /** `keepableVideos`: videos the caller may carry over (the edited session's own). */
  private async buildSets(
    setInputs: SetLogInput[],
    keepableVideos: Set<string> = new Set(),
  ): Promise<SetLog[]> {
    const byId = await this.exercises.findManyByIds([
      ...new Set(
        setInputs.flatMap((s) => [
          s.exerciseId,
          ...(s.supersetPartners ?? []).map((p) => p.exerciseId),
        ]),
      ),
    ]);
    return setInputs.map((setInput, i) => {
      const set = new SetLog();
      set.orderIndex = i + 1;
      set.exercise = byId.get(setInput.exerciseId)!;
      set.setNumber = setInput.setNumber;
      set.weight = setInput.weight;
      set.reps = setInput.reps;
      set.rpe = setInput.rpe ?? null;
      set.setType = setInput.setType ?? SetType.WORKING;
      set.videoFile =
        setInput.videoFile && keepableVideos.has(setInput.videoFile) ? setInput.videoFile : null;
      // The comment belongs to the video: no video, no comment.
      set.videoNote = set.videoFile ? setInput.videoNote?.trim() || null : null;
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
