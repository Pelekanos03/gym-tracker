import { DataSourceOptions } from 'typeorm';
import { User } from '../domain/user.entity';
import { Friendship } from '../domain/friendship.entity';
import { Coaching } from '../domain/coaching.entity';
import { Exercise } from '../domain/exercise.entity';
import { Program } from '../domain/program.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { ProgramExercise } from '../domain/program-exercise.entity';
import { ProgramShare } from '../domain/program-share.entity';
import { WorkoutSession } from '../domain/workout-session.entity';
import { SetLog } from '../domain/set-log.entity';
import { SetDrop } from '../domain/set-drop.entity';
import { SupersetPartner } from '../domain/superset-partner.entity';
import { TrainingBlock } from '../domain/training-block.entity';
import { BodyWeightEntry } from '../domain/body-weight-entry.entity';
import { PasswordResetToken } from '../domain/password-reset-token.entity';
import { Feedback } from '../domain/feedback.entity';
import { isPostgres } from './column-types';

const entities = [
  User,
  Friendship,
  Coaching,
  Exercise,
  Program,
  ProgramDay,
  ProgramExercise,
  ProgramShare,
  WorkoutSession,
  SetLog,
  SetDrop,
  SupersetPartner,
  TrainingBlock,
  BodyWeightEntry,
  PasswordResetToken,
  Feedback,
];

/**
 * Single source of truth for the DB connection, shared by the Nest app,
 * the seed script and the migration CLI.
 *
 * - DATABASE_URL set (Docker / production) → PostgreSQL. The schema is
 *   owned by migrations (src/database/migrations), applied on startup.
 * - Otherwise (local dev) → a SQLite file, schema auto-synced from the
 *   entities for zero setup.
 */
export const dataSourceOptions: DataSourceOptions = isPostgres
  ? {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities,
      // .ts under ts-node (CLI), .js once compiled — never the emitted .d.ts files.
      migrations: [`${__dirname}/migrations/*.${__filename.endsWith('.ts') ? 'ts' : 'js'}`],
      migrationsRun: true,
      synchronize: false,
    }
  : {
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH ?? 'gym-app.sqlite',
      entities,
      synchronize: process.env.DB_SYNCHRONIZE !== 'false',
    };
