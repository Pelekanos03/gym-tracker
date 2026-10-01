// Mirrors the shapes the NestJS API returns. Kept deliberately small.

export type ExerciseCategory = 'COMPOUND' | 'ISOLATION';

/**
 * What role a set played. Drives two rules on the backend:
 *  - volume counts every type except WARMUP
 *  - progress/PR charts count WORKING sets only
 */
export type SetType = 'WORKING' | 'WARMUP' | 'DROP_SET' | 'SUPERSET' | 'BACKOFF' | 'AMRAP';

export const SET_TYPE_LABELS: Record<SetType, string> = {
  WORKING: 'Working',
  WARMUP: 'Warm-up',
  DROP_SET: 'Drop set',
  SUPERSET: 'Superset',
  BACKOFF: 'Back-off',
  AMRAP: 'AMRAP',
};

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  /** Only on /auth/me: may read testers' feedback. */
  isAdmin?: boolean;
}

export interface FeedbackItem {
  id: string;
  from: { name: string; email: string };
  message: string;
  page: string;
  userAgent: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscle: string;
  isCompetitionLift: boolean;
  /** Who added it; null = built-in, shared by everyone. */
  ownerId: string | null;
}

export interface FriendEntry {
  friendshipId: string;
  since: string;
  friend: User;
}

export interface FriendRequest {
  id: string;
  createdAt: string;
  from: User;
  to: User;
}

/**
 * An elevated permission on top of an existing friendship: the coach sees
 * the client's full history and programs, which a plain friend can't (a
 * plain friend only sees progress). The coach requests it; the client
 * accepts.
 */
export interface CoachingRequest {
  id: string;
  createdAt: string;
  coach: User;
  client: User;
}

export interface CoachLink {
  coachingId: string;
  coach: User;
}

export interface ClientLink {
  coachingId: string;
  client: User;
}

export interface ProgramExercise {
  id: string;
  exercise: Exercise;
  orderIndex: number;
  targetSets: number;
  targetReps: number;
  targetRpe: number | null;
  targetPercent1rm: number | null;
  targetWeight: number | null;
  setType: SetType;
  notes: string;
}

export interface ProgramDay {
  id: string;
  weekNumber: number;
  dayNumber: number;
  name: string;
  exercises: ProgramExercise[];
}

export interface Program {
  id: string;
  name: string;
  description: string;
  lengthWeeks: number;
  owner: User;
  days: ProgramDay[];
  createdAt: string;
}

/** One drop after the top set of a drop set. */
export interface SetDrop {
  id: string;
  orderIndex: number;
  weight: number;
  reps: number;
}

/** The other exercise done back-to-back with a superset set. */
export interface SupersetPartner {
  id: string;
  exercise: Exercise;
  orderIndex: number;
  weight: number;
  reps: number;
}

export interface SetLog {
  id: string;
  exercise: Exercise;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  setType: SetType;
  /** Only a DROP_SET has any. */
  drops: SetDrop[];
  /** Only a SUPERSET has any. */
  supersetPartners: SupersetPartner[];
  /** Set when the set has a video; play it via videoUrl(set.id). */
  videoFile: string | null;
}

export interface WorkoutSession {
  id: string;
  user: User;
  programDay: ProgramDay | null;
  date: string;
  status: 'PLANNED' | 'COMPLETED' | 'SKIPPED';
  notes: string;
  sets: SetLog[];
  createdAt: string;
}

export interface ProgressPoint {
  date: string;
  bestWeight: number;
  bestEstimatedOneRepMax: number;
  topSet: { weight: number; reps: number; rpe: number | null };
}

export interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  points: ProgressPoint[];
  allTimeBestE1rm: number;
}

export type BlockDayStatus = 'DONE' | 'TODO';

/** One day of a training block and where the user stands on it. */
export interface BlockDay {
  week: number;
  day: number;
  programDayId: string;
  name: string;
  status: BlockDayStatus;
  doneOn: string | null;
}

/**
 * A run of a program. Not calendar-based: days can be trained in any
 * order; `next` suggests where the user left off.
 */
export interface TrainingBlock {
  id: string;
  status: 'ACTIVE' | 'FINISHED';
  startedOn: string;
  endedOn: string | null;
  program: { id: string; name: string; owner: { id: string; name: string } };
  days: BlockDay[];
  next: BlockDay | null;
}

export interface BodyWeightEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** kg */
  weight: number;
}
