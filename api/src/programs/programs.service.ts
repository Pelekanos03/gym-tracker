import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program } from '../domain/program.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { ProgramExercise } from '../domain/program-exercise.entity';
import { ProgramAssignment } from '../domain/program-assignment.entity';
import { UserRole } from '../common/enums';
import { UsersService } from '../users/users.service';
import { ExercisesService } from '../exercises/exercises.service';
import { CoachingService } from '../coaching/coaching.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { AssignProgramDto } from './dto/assign-program.dto';

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(Program)
    private readonly programs: Repository<Program>,
    @InjectRepository(ProgramAssignment)
    private readonly assignments: Repository<ProgramAssignment>,
    private readonly users: UsersService,
    private readonly exercises: ExercisesService,
    private readonly coaching: CoachingService,
  ) {}

  /** Coach authors a full program in one call (days + prescribed exercises). */
  async create(dto: CreateProgramDto): Promise<Program> {
    const coach = await this.users.requireRole(dto.coachId, UserRole.COACH);

    // Resolve every referenced exercise up front so a bad id fails fast.
    const exerciseIds = dto.days.flatMap((d) =>
      d.exercises.map((e) => e.exerciseId),
    );
    const byId = await this.exercises.findManyByIds([...new Set(exerciseIds)]);

    const program = new Program();
    program.name = dto.name;
    program.description = dto.description ?? '';
    if (dto.discipline) program.discipline = dto.discipline;
    if (dto.lengthWeeks) program.lengthWeeks = dto.lengthWeeks;
    program.coach = coach;
    program.days = dto.days.map((dayInput) => {
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
        pe.notes = exInput.notes ?? '';
        return pe;
      });
      return day;
    });

    return this.programs.save(program);
  }

  findByCoach(coachId: string): Promise<Program[]> {
    return this.programs.find({
      where: { coach: { id: coachId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Program> {
    const program = await this.programs.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  /** Coach assigns one of their programs to a client on their roster. */
  async assign(
    programId: string,
    dto: AssignProgramDto,
  ): Promise<ProgramAssignment> {
    const program = await this.findById(programId);
    if (program.coach.id !== dto.coachId) {
      throw new NotFoundException('That program does not belong to this coach');
    }
    await this.coaching.assertCoaches(dto.coachId, dto.clientId);

    const client = await this.users.requireRole(dto.clientId, UserRole.CLIENT);
    const coach = program.coach;

    const assignment = this.assignments.create({
      program,
      client,
      assignedBy: coach,
      startDate: dto.startDate ?? new Date().toISOString().slice(0, 10),
      active: true,
    });
    return this.assignments.save(assignment);
  }

  assignmentsForClient(clientId: string): Promise<ProgramAssignment[]> {
    return this.assignments.find({
      where: { client: { id: clientId } },
      order: { createdAt: 'DESC' },
    });
  }
}
