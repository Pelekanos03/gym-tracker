import { EntityManager } from 'typeorm';
import { Exercise } from '../domain/exercise.entity';

/**
 * Of `userId`'s own exercises (or just `exerciseId`), the ones someone
 * else's data still points at: another user's logged sets or superset
 * partners, or another user's program (e.g. a copy they were sent).
 * Those must be kept — retired — rather than deleted, or the other
 * person's history would lose sets.
 */
export async function ownExercisesUsedByOthers(
  db: EntityManager,
  userId: string,
  exerciseId?: string,
): Promise<string[]> {
  const query = db
    .getRepository(Exercise)
    .createQueryBuilder('e')
    .select('e.id', 'id')
    .where('e.ownerId = :me', { me: userId })
    .andWhere(
      // Identifiers quoted: Postgres folds unquoted camelCase to lower case.
      `(EXISTS (SELECT 1 FROM set_logs sl JOIN workout_sessions ws ON ws.id = sl."sessionId"
                WHERE sl."exerciseId" = e.id AND ws."userId" <> :me)
        OR EXISTS (SELECT 1 FROM superset_partners sp JOIN set_logs sl2 ON sl2.id = sp."setId"
                JOIN workout_sessions ws2 ON ws2.id = sl2."sessionId"
                WHERE sp."exerciseId" = e.id AND ws2."userId" <> :me)
        OR EXISTS (SELECT 1 FROM program_exercises pe JOIN program_days pd ON pd.id = pe."programDayId"
                JOIN programs p ON p.id = pd."programId"
                WHERE pe."exerciseId" = e.id AND p."ownerId" <> :me))`,
    );
  if (exerciseId) query.andWhere('e.id = :exerciseId', { exerciseId });
  return (await query.getRawMany<{ id: string }>()).map((r) => r.id);
}
