import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { BUILT_IN_EXERCISES } from '../database/built-in-exercises';
import { Exercise } from '../domain/exercise.entity';
import { ProgramExercise } from '../domain/program-exercise.entity';
import { SetLog } from '../domain/set-log.entity';
import { SupersetPartner } from '../domain/superset-partner.entity';
import { HiddenExercise } from '../domain/hidden-exercise.entity';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ownExercisesUsedByOthers } from './exercise-usage';

export interface ExerciseDeletePreview {
  /** Your logged sets (incl. superset partners) that go with it. */
  setLogCount: number;
  /** Lines in your programs that go with it. */
  programExerciseCount: number;
  /** A friend's/client's data uses it: it's kept for them, just leaves your library. */
  usedByOthers: boolean;
}

export interface ExerciseMergePreview {
  programExerciseCount: number;
  setLogCount: number;
}

@Injectable()
export class ExercisesService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Exercise)
    private readonly exercises: Repository<Exercise>,
    @InjectRepository(ProgramExercise)
    private readonly programExercises: Repository<ProgramExercise>,
    @InjectRepository(SetLog)
    private readonly setLogs: Repository<SetLog>,
    @InjectRepository(SupersetPartner)
    private readonly supersetPartners: Repository<SupersetPartner>,
    @InjectRepository(HiddenExercise)
    private readonly hidden: Repository<HiddenExercise>,
  ) {}

  /** Adds any missing built-in exercise, so a brand-new database starts with the library. */
  async onApplicationBootstrap(): Promise<void> {
    let added = 0;
    for (const data of BUILT_IN_EXERCISES) {
      const exists = await this.exercises.exist({ where: { name: data.name, ownerId: IsNull() } });
      if (!exists) {
        await this.exercises.save(this.exercises.create(data));
        added++;
      }
    }
    if (added > 0) new Logger('Exercises').log(`Added ${added} built-in exercises`);
  }

  /**
   * The library as `userId` sees it: the built-in exercises, the ones they
   * added themselves, plus any friend's private exercise that reaches them
   * through a program they own, were shared, or run as a block, or that they
   * logged sets against — otherwise a copied program would reference
   * exercises missing from their own pickers.
   */
  async findVisibleTo(userId: string): Promise<(Exercise & { hidden: boolean })[]> {
    // Built-ins the user hid are still returned (flagged), because their
    // own old sets and programs refer to them; pickers leave them out.
    const hiddenIds = new Set(
      (await this.hidden.find({ where: { user: { id: userId } }, relations: { exercise: true } })).map(
        (h) => h.exercise.id,
      ),
    );
    const list = await this.exercises
      .createQueryBuilder('e')
      .where('(e.ownerId IS NULL AND e.retired = :notRetired)', { notRetired: false })
      .orWhere('e.ownerId = :userId')
      .orWhere(
        // Identifiers are double-quoted: Postgres folds unquoted names to
        // lower case, and the join columns are camelCase ("exerciseId").
        `e.id IN (
          SELECT pe."exerciseId" FROM program_exercises pe
          JOIN program_days pd ON pd.id = pe."programDayId"
          WHERE pd."programId" IN (
            SELECT id FROM programs WHERE "ownerId" = :userId
            UNION SELECT "programId" FROM program_shares WHERE "sharedWithId" = :userId
            UNION SELECT "programId" FROM training_blocks WHERE "userId" = :userId
          )
        )`,
      )
      .orWhere(
        `e.id IN (
          SELECT sl."exerciseId" FROM set_logs sl
          JOIN workout_sessions ws ON ws.id = sl."sessionId"
          WHERE ws."userId" = :userId
          UNION
          SELECT sp."exerciseId" FROM superset_partners sp
          JOIN set_logs sl2 ON sl2.id = sp."setId"
          JOIN workout_sessions ws2 ON ws2.id = sl2."sessionId"
          WHERE ws2."userId" = :userId
        )`,
      )
      .setParameter('userId', userId)
      .orderBy('e.name', 'ASC')
      .getMany();
    return list.map((e) => Object.assign(e, { hidden: hiddenIds.has(e.id) }));
  }

  /** Takes a built-in exercise out of this user's library (own exercises get deleted instead). */
  async hide(id: string, userId: string): Promise<void> {
    const exercise = await this.findById(id);
    if (exercise.ownerId !== null) {
      throw new BadRequestException('Only built-in exercises can be hidden — delete your own instead.');
    }
    const exists = await this.hidden.exist({ where: { user: { id: userId }, exercise: { id } } });
    if (!exists) await this.hidden.save(this.hidden.create({ user: { id: userId }, exercise: { id } }));
  }

  async unhide(id: string, userId: string): Promise<void> {
    await this.hidden.delete({ user: { id: userId }, exercise: { id } });
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

  /** Adds a private exercise to `dto.ownerId`'s library only. */
  async create(dto: CreateExerciseDto): Promise<Exercise> {
    const { ownerId, ...fields } = dto;
    const name = fields.name.trim();
    const primaryMuscle = await this.canonicalMuscle(fields.primaryMuscle, ownerId);
    const clash = await this.exercises
      .createQueryBuilder('e')
      .where('LOWER(e.name) = LOWER(:name)', { name })
      .andWhere('(e.ownerId IS NULL OR e.ownerId = :ownerId)', { ownerId })
      .getOne();
    if (clash) {
      throw new ConflictException(`"${clash.name}" is already in your exercise library.`);
    }
    return this.exercises.save(this.exercises.create({ ...fields, name, primaryMuscle, ownerId }));
  }

  /**
   * Body parts stay free text — someone chasing "Serratus" or "Upper chest"
   * can have exactly that — but a spelling of one that already exists
   * ("chests", "CHEST ") reuses the existing name, so the picker doesn't
   * sprout near-duplicate groups.
   */
  private async canonicalMuscle(input: string, ownerId: string): Promise<string> {
    const typed = input.trim().replace(/\s+/g, ' ');
    const key = (m: string) => m.trim().toLowerCase().replace(/\s+/g, ' ').replace(/s$/, '');
    const existing = await this.findVisibleTo(ownerId);
    const match = existing.find((e) => key(e.primaryMuscle) === key(typed));
    if (match) return match.primaryMuscle;
    return typed.charAt(0).toUpperCase() + typed.slice(1);
  }

  /**
   * How much would merging `mergeId` into `keepId` touch? Lets the caller
   * show "this will move N program lines and M logged sets" so the user can
   * make an informed call before committing to an irreversible merge.
   */
  async mergePreview(
    keepId: string,
    mergeId: string,
    userId: string,
  ): Promise<ExerciseMergePreview> {
    await this.assertMergeable(keepId, mergeId, userId);
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
  async merge(keepId: string, mergeId: string, userId: string): Promise<Exercise> {
    const { keep } = await this.assertMergeable(keepId, mergeId, userId);
    await this.exercises.manager.transaction(async (manager) => {
      // Query builder rather than raw SQL: placeholder syntax differs
      // between SQLite (?) and Postgres ($1).
      for (const entity of [ProgramExercise, SetLog, SupersetPartner]) {
        await manager
          .createQueryBuilder()
          .update(entity)
          .set({ exercise: { id: keepId } })
          .where('"exerciseId" = :mergeId', { mergeId })
          .execute();
      }
      await manager.delete(Exercise, { id: mergeId });
    });
    return keep;
  }

  /**
   * You can only fold away (and so delete) an exercise you added yourself —
   * never a built-in one or a friend's — and only into one you can see.
   */
  /** What deleting one of your own exercises would take with it — shown before confirming. */
  async deletePreview(id: string, userId: string): Promise<ExerciseDeletePreview> {
    await this.findOwned(id, userId);
    const mine = { exercise: { id } };
    const [sets, partners, lines, usedByOthers] = await Promise.all([
      this.setLogs.count({ where: { ...mine, session: { user: { id: userId } } } }),
      this.supersetPartners.count({ where: { ...mine, set: { session: { user: { id: userId } } } } }),
      this.programExercises.count({ where: { ...mine, programDay: { program: { owner: { id: userId } } } } }),
      ownExercisesUsedByOthers(this.exercises.manager, userId, id),
    ]);
    return { setLogCount: sets + partners, programExerciseCount: lines, usedByOthers: usedByOthers.length > 0 };
  }

  /**
   * Deletes one of your own exercises, with your sets and program lines
   * that use it. If someone else's data still uses it, it's retired
   * instead — gone from your library, kept for them.
   */
  async deleteOwn(id: string, userId: string): Promise<void> {
    await this.findOwned(id, userId);
    await this.exercises.manager.transaction(async (tx) => {
      const params = { id, me: userId };
      await tx
        .createQueryBuilder()
        .delete()
        .from(SupersetPartner)
        .where(`"exerciseId" = :id AND "setId" IN (SELECT sl.id FROM set_logs sl
                 JOIN workout_sessions ws ON ws.id = sl."sessionId" WHERE ws."userId" = :me)`, params)
        .execute();
      await tx
        .createQueryBuilder()
        .delete()
        .from(SetLog)
        .where(`"exerciseId" = :id AND "sessionId" IN (SELECT id FROM workout_sessions WHERE "userId" = :me)`, params)
        .execute();
      await tx
        .createQueryBuilder()
        .delete()
        .from(ProgramExercise)
        .where(`"exerciseId" = :id AND "programDayId" IN (SELECT pd.id FROM program_days pd
                 JOIN programs p ON p.id = pd."programId" WHERE p."ownerId" = :me)`, params)
        .execute();

      const stillUsed = (await ownExercisesUsedByOthers(tx, userId, id)).length > 0;
      if (stillUsed) {
        await tx.getRepository(Exercise).update(id, { retired: true, ownerId: null });
      } else {
        await tx.getRepository(Exercise).delete(id);
      }
    });
  }

  private async findOwned(id: string, userId: string): Promise<Exercise> {
    const exercise = await this.findById(id);
    if (exercise.ownerId !== userId) {
      throw new ForbiddenException('You can only delete exercises you added yourself');
    }
    return exercise;
  }

  private async assertMergeable(
    keepId: string,
    mergeId: string,
    userId: string,
  ): Promise<{ keep: Exercise; merge: Exercise }> {
    if (keepId === mergeId) {
      throw new BadRequestException('Pick two different exercises to merge.');
    }
    const [keep, merge] = await Promise.all([this.findById(keepId), this.findById(mergeId)]);
    if (merge.ownerId !== userId) {
      throw new ForbiddenException(
        `You can only merge away exercises you added yourself — "${merge.name}" isn't one of yours.`,
      );
    }
    if (keep.ownerId !== null && keep.ownerId !== userId) {
      throw new ForbiddenException(`"${keep.name}" isn't in your exercise library.`);
    }
    return { keep, merge };
  }
}
