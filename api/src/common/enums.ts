/**
 * Shared enums for the domain model.
 * Keeping them in one place means every entity and DTO speaks the same language.
 */

/** What a user is allowed to do in the platform. */
export enum UserRole {
  COACH = 'COACH',
  CLIENT = 'CLIENT',
}

/** Broad training focus. An exercise (or program) can serve one or both. */
export enum Discipline {
  POWERLIFTING = 'POWERLIFTING',
  BODYBUILDING = 'BODYBUILDING',
  BOTH = 'BOTH',
}

/** Compound lifts drive strength; isolation work drives hypertrophy. */
export enum ExerciseCategory {
  COMPOUND = 'COMPOUND',
  ISOLATION = 'ISOLATION',
}

/** Lifecycle of a workout the client is expected to do. */
export enum SessionStatus {
  PLANNED = 'PLANNED',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}
