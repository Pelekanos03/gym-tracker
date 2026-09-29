import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Exercise } from '../domain/exercise.entity';
import { ProgramExercise } from '../domain/program-exercise.entity';
import { SetLog } from '../domain/set-log.entity';
import { SupersetPartner } from '../domain/superset-partner.entity';
import { CreateExerciseDto } from './dto/create-exercise.dto';

export interface ExerciseMergePreview {
  programExerciseCount: number;
  setLogCount: number;
}

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private readonly exercises: Repository<Exercise>,
    @InjectRepository(ProgramExercise)
    private readonly programExercises: Repository<ProgramExercise>,
    @InjectRepository(SetLog)
    private readonly setLogs: Repository<SetLog>,
    @InjectRepository(SupersetPartner)
    private readonly supersetPartners: Repository<SupersetPartner>,
  ) {}

  findAll(): Promise<Exercise[]> {
    return this.exercises.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Exercise> {
    const exercise = await this.exercises.findOne({ where: { id } });
    if (!exercise) throw new NotFoundException('Exercise not found');
    return exercise;
  }

  async findManyByIds(ids: string[]): Promise<Map<string, Exercise>> {
    const found = await this.exercises.find({ where: { id: In(ids) } });
    const byId = new Map(found.map((e) => [e.id, e]));
    for (const id of ids) {
      if (!byId.has(id)) throw new NotFoundException(`Exercise ${id} not found`);
    }
    return byId;
  }

  create(dto: CreateExerciseDto): Promise<Exercise> {
    return this.exercises.save(this.exercises.create(dto));
  }

  /**
   * How much would merging `mergeId` into `keepId` touch? Lets the caller
   * show "this will move N program lines and M logged sets" so the user can
   * make an informed call before committing to an irreversible merge.
   */
  async mergePreview(keepId: string, mergeId: string): Promise<ExerciseMergePreview> {
    await this.assertMergeable(keepId, mergeId);
    const [programExerciseCount, setLogCount, supersetPartnerCount] = await Promise.all([
      this.programExercises.count({ where: { exercise: { id: mergeId } } }),
      this.setLogs.count({ where: { exercise: { id: mergeId } } }),
      this.supersetPartners.count({ where: { exercise: { id: mergeId } } }),
    ]);
    // A superset partner is a logged set too, just stored alongside its main set.
    return { programExerciseCount, setLogCount: setLogCount + supersetPartnerCount };
  }

  /**
   * Merges two exercise-library entries that turned out to be the same
   * movement — e.g. a friend logs "Bench" while you log "Bench Press" for
   * the same lift, and sharing surfaces them as two unrelated exercises.
   * Every program line and logged set pointing at `mergeId` is repointed to
   * `keepId`, then the now-empty duplicate is deleted. Irreversible — the
   * caller (the UI's confirmation step) is expected to have made sure first.
   */
  async merge(keepId: string, mergeId: string): Promise<Exercise> {
    const { keep } = await this.assertMergeable(keepId, mergeId);
    await this.exercises.manager.transaction(async (manager) => {
      await manager.query('UPDATE program_exercises SET exerciseId = ? WHERE exerciseId = ?', [
        keepId,
        mergeId,
      ]);
      await manager.query('UPDATE set_logs SET exerciseId = ? WHERE exerciseId = ?', [
        keepId,
        mergeId,
      ]);
      await manager.query('UPDATE superset_partners SET exerciseId = ? WHERE exerciseId = ?', [
        keepId,
        mergeId,
      ]);
      await manager.delete(Exercise, { id: mergeId });
    });
    return keep;
  }

  private async assertMergeable(
    keepId: string,
    mergeId: string,
  ): Promise<{ keep: Exercise; merge: Exercise }> {
    if (keepId === mergeId) {
      throw new BadRequestException('Pick two different exercises to merge.');
    }
    const [keep, merge] = await Promise.all([this.findById(keepId), this.findById(mergeId)]);
    return { keep, merge };
  }
}
