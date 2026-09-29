/**
 * Shared enums for the domain model.
 * Keeping them in one place means every entity and DTO speaks the same language.
 */

/** Compound lifts drive strength; isolation work drives hypertrophy. */
export enum ExerciseCategory {
  COMPOUND = 'COMPOUND',
  ISOLATION = 'ISOLATION',
}

/** Lifecycle of a workout a user is expected to do. */
export enum SessionStatus {
  PLANNED = 'PLANNED',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

/** Where a friendship stands between two users. */
export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
}

/**
 * Where a coaching link stands. Coaching is an elevated permission layered
 * on top of an existing friendship (you must already be friends), not a
 * separate connection: the coach requests it, the would-be client accepts.
 */
export enum CoachingStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
}

/**
 * What role a logged set played, beyond just "weight x reps". Drives two
 * independent rules (see WorkoutSession.totalVolume and ProgressService):
 *  - volume counts every type except WARMUP
 *  - progress/PR charts count WORKING sets only
 */
export enum SetType {
  WORKING = 'WORKING',
  WARMUP = 'WARMUP',
  DROP_SET = 'DROP_SET',
  SUPERSET = 'SUPERSET',
  BACKOFF = 'BACKOFF',
  AMRAP = 'AMRAP',
}

/** Whether a training block is still being run, or has been finished/ended by the user. */
export enum BlockStatus {
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
}
