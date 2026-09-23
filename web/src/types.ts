// Mirrors the shapes the NestJS API returns. Kept deliberately small.

export type Discipline = 'POWERLIFTING' | 'BODYBUILDING' | 'BOTH';
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
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  discipline: Discipline;
  primaryMuscle: string;
  isCompetitionLift: boolean;
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
  discipline: Discipline;
  lengthWeeks: number;
  owner: User;
  days: ProgramDay[];
  createdAt: string;
}

export interface SetLog {
  id: string;
  exercise: Exercise;
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  setType: SetType;
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
