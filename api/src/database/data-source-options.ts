import { DataSourceOptions } from 'typeorm';
import { User } from '../domain/user.entity';
import { CoachingRelationship } from '../domain/coaching-relationship.entity';
import { Exercise } from '../domain/exercise.entity';
import { Program } from '../domain/program.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { ProgramExercise } from '../domain/program-exercise.entity';
import { ProgramAssignment } from '../domain/program-assignment.entity';
import { WorkoutSession } from '../domain/workout-session.entity';
import { SetLog } from '../domain/set-log.entity';

/**
 * Single source of truth for the DB connection, shared by the Nest app and
 * the standalone seed script. SQLite keeps setup to zero for development;
 * swap the driver here when you move to Postgres.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'better-sqlite3',
  database: process.env.DATABASE_PATH ?? 'gym-app.sqlite',
  entities: [
    User,
    CoachingRelationship,
    Exercise,
    Program,
    ProgramDay,
    ProgramExercise,
    ProgramAssignment,
    WorkoutSession,
    SetLog,
  ],
  // Dev only: auto-create tables from entities. Use migrations in production.
  synchronize: true,
};
