import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutSession } from '../domain/workout-session.entity';
import { ProgramAssignment } from '../domain/program-assignment.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { SetLog } from '../domain/set-log.entity';
import { UserRole } from '../common/enums';
import { UsersService } from '../users/users.service';
import { ExercisesService } from '../exercises/exercises.service';
import { CoachingService } from '../coaching/coaching.service';
import { LogSessionDto } from './dto/log-session.dto';

@Injectable()
export class WorkoutsService {
  constructor(
    @InjectRepository(WorkoutSession)
    private readonly sessions: Repository<WorkoutSession>,
    @InjectRepository(ProgramAssignment)
    private readonly assignments: Repository<ProgramAssignment>,
    @InjectRepository(ProgramDay)
    private readonly programDays: Repository<ProgramDay>,
    private readonly users: UsersService,
    private readonly exercises: ExercisesService,
    private readonly coaching: CoachingService,
  ) {}

  /** Client records a training session and all the sets they did. */
  async log(dto: LogSessionDto): Promise<WorkoutSession> {
    const client = await this.users.requireRole(dto.clientId, UserRole.CLIENT);

    const byId = await this.exercises.findManyByIds([
      ...new Set(dto.sets.map((s) => s.exerciseId)),
    ]);

    const session = new WorkoutSession();
    session.client = client;
    session.date = dto.date;
    if (dto.status) session.status = dto.status;
    session.notes = dto.notes ?? '';

    if (dto.assignmentId) {
      session.assignment = await this.assignments.findOne({
        where: { id: dto.assignmentId },
      });
      if (!session.assignment) {
        throw new NotFoundException('Assignment not found');
      }
    }
    if (dto.programDayId) {
      session.programDay = await this.programDays.findOne({
        where: { id: dto.programDayId },
      });
      if (!session.programDay) {
        throw new NotFoundException('Program day not found');
      }
    }

    session.sets = dto.sets.map((setInput) => {
      const set = new SetLog();
      set.exercise = byId.get(setInput.exerciseId)!;
      set.setNumber = setInput.setNumber;
      set.weight = setInput.weight;
      set.reps = setInput.reps;
      set.rpe = setInput.rpe ?? null;
      set.isWarmup = setInput.isWarmup ?? false;
      return set;
    });

    return this.sessions.save(session);
  }

  /** A client's own training history. */
  historyForClient(clientId: string): Promise<WorkoutSession[]> {
    return this.sessions.find({
      where: { client: { id: clientId } },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<WorkoutSession> {
    const session = await this.sessions.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /**
   * Coach view: "see what my client did". Enforces that the coach actually
   * coaches this client before returning anything.
   */
  async clientHistoryForCoach(
    coachId: string,
    clientId: string,
  ): Promise<WorkoutSession[]> {
    await this.coaching.assertCoaches(coachId, clientId);
    return this.historyForClient(clientId);
  }
}
