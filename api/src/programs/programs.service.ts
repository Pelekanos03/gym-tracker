import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program } from '../domain/program.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { ProgramExercise } from '../domain/program-exercise.entity';
import { Exercise } from '../domain/exercise.entity';
import { SetType } from '../common/enums';
import { UsersService } from '../users/users.service';
import { ExercisesService } from '../exercises/exercises.service';
import { CoachingService } from '../coaching/coaching.service';
import { CreateProgramDto, ProgramDayInput } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { CopyProgramDto } from './dto/copy-program.dto';

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(Program)
    private readonly programs: Repository<Program>,
    @InjectRepository(ProgramDay)
    private readonly programDays: Repository<ProgramDay>,
    private readonly users: UsersService,
    private readonly exercises: ExercisesService,
    private readonly coaching: CoachingService,
  ) {}

  /** A user authors a full program in one call (days + prescribed exercises). */
  async create(dto: CreateProgramDto): Promise<Program> {
    const owner = await this.users.findById(dto.ownerId);
    const days = await this.buildDays(dto.days);

    const program = new Program();
    program.name = dto.name;
    program.description = dto.description ?? '';
    if (dto.lengthWeeks) program.lengthWeeks = dto.lengthWeeks;
    program.owner = owner;
    program.days = days;

    return this.programs.save(program);
  }

  findByOwner(ownerId: string): Promise<Program[]> {
    return this.programs.find({
      where: { owner: { id: ownerId } },
      order: { createdAt: 'DESC' },
    });
  }

  /** A coach viewing their client's programs — requires an accepted coaching link (a plain friend can't do this). */
  async findByOwnerForCoach(ownerId: string, viewerId: string): Promise<Program[]> {
    await this.coaching.assertCoach(viewerId, ownerId);
    return this.findByOwner(ownerId);
  }

  async findById(id: string): Promise<Program> {
    const program = await this.programs.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  /**
   * Replaces a program's fields and its full set of days/exercises. Only the
   * owner may edit. Old days (and their exercises) are deleted and rebuilt
   * from the submitted shape — simplest way to keep this consistent with create.
   */
  async update(programId: string, dto: UpdateProgramDto): Promise<Program> {
    const program = await this.findById(programId);
    if (program.owner.id !== dto.ownerId) {
      throw new ForbiddenException('Only the owner can edit this program');
    }

    program.name = dto.name;
    program.description = dto.description ?? '';
    if (dto.lengthWeeks) program.lengthWeeks = dto.lengthWeeks;

    if (program.days.length > 0) {
      await this.programDays.remove(program.days);
    }
    program.days = await this.buildDays(dto.days);

    return this.programs.save(program);
  }

  /**
   * Deep-copies a program into another user's library — i.e. "send" it as
   * their own, independently-editable program. Deliberately narrow: only
   * the program's own owner (duplicating it for themselves) or an accepted
   * coach of the destination user may do this. Plain friends can't — that's
   * what let a paid coaching program get copied for free by anyone. Friends
   * use share() instead, which never hands over an owned copy.
   */
  async copy(programId: string, dto: CopyProgramDto, actorId: string): Promise<Program> {
    const source = await this.findById(programId);
    if (source.owner.id !== actorId) {
      throw new ForbiddenException('Only the owner can send a copy of this program');
    }
    const toUser = await this.users.findById(dto.toUserId);
    if (source.owner.id !== toUser.id) {
      await this.coaching.assertCoach(source.owner.id, toUser.id);
    }

    const copy = new Program();
    copy.name = source.name;
    copy.description = source.description;
    copy.lengthWeeks = source.lengthWeeks;
    copy.owner = toUser;
    copy.days = source.days.map((day) => {
      const d = new ProgramDay();
      d.weekNumber = day.weekNumber;
      d.dayNumber = day.dayNumber;
      d.name = day.name;
      d.exercises = day.exercises.map((pe) => {
        const ex = new ProgramExercise();
        ex.exercise = pe.exercise;
        ex.orderIndex = pe.orderIndex;
        ex.targetSets = pe.targetSets;
        ex.targetReps = pe.targetReps;
        ex.targetRpe = pe.targetRpe;
        ex.targetPercent1rm = pe.targetPercent1rm;
        ex.targetWeight = pe.targetWeight;
        ex.setType = pe.setType;
        ex.notes = pe.notes;
        return ex;
      });
      return d;
    });

    return this.programs.save(copy);
  }

  /** Only the owner may delete their own program. */
  async delete(programId: string, ownerId: string): Promise<void> {
    const program = await this.findById(programId);
    if (program.owner.id !== ownerId) {
      throw new ForbiddenException('Only the owner can delete this program');
    }
    await this.programs.remove(program);
  }

  /** Shared day/exercise construction used by both create and update. */
  private async buildDays(dayInputs: ProgramDayInput[]): Promise<ProgramDay[]> {
    const exerciseIds = dayInputs.flatMap((d) => d.exercises.map((e) => e.exerciseId));
    const byId: Map<string, Exercise> = await this.exercises.findManyByIds([
      ...new Set(exerciseIds),
    ]);

    return dayInputs.map((dayInput) => {
      const day = new ProgramDay();
      day.weekNumber = dayInput.weekNumber;
      day.dayNumber = dayInput.dayNumber;
      day.name = dayInput.name;
      day.exercises = dayInput.exercises.map((exInput) => {
        const pe = new ProgramExercise();
        pe.exercise = byId.get(exInput.exerciseId)!;
        pe.orderIndex = exInput.orderIndex;
        pe.targetSets = exInput.targetSets;
        pe.targetReps = exInput.targetReps;
        pe.targetRpe = exInput.targetRpe ?? null;
        pe.targetPercent1rm = exInput.targetPercent1rm ?? null;
        pe.targetWeight = exInput.targetWeight ?? null;
        pe.setType = exInput.setType ?? SetType.WORKING;
        pe.notes = exInput.notes ?? '';
        return pe;
      });
      return day;
    });
  }
}
