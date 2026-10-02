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
  /** Your own setting (only on your own user): in-app reminder to log body weight. */
  weightReminder?: WeightReminder;
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
  /** A built-in this user took out of their library: kept for their history, left out of pickers. */
  hidden?: boolean;
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
  /** The lifter's comment on that video. */
  videoNote?: string | null;
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

export type WeightReminder = 'off' | 'daily' | 'weekly';

/** The built-in activities; a user can add their own, stored by name. */
export type CardioActivity = 'run' | 'walk' | 'bike' | 'row' | 'swim' | 'elliptical' | 'stairs' | 'hiit' | 'other';

export const CARDIO_LABELS: Record<CardioActivity, string> = {
  run: 'Run',
  walk: 'Walk',
  bike: 'Bike',
  row: 'Rowing',
  swim: 'Swim',
  elliptical: 'Elliptical',
  stairs: 'Stairs',
  hiit: 'HIIT',
  other: 'Other',
};

/** "Run" for a built-in key, or the user's own activity name as typed. */
export function cardioLabel(activity: string): string {
  return CARDIO_LABELS[activity as CardioActivity] ?? activity;
}

export interface CardioSession {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** A built-in key or the user's own activity name — show it with cardioLabel(). */
  activity: string;
  durationSeconds: number;
  distanceKm: number | null;
  avgHeartRate: number | null;
  calories: number | null;
  notes: string;
}

export interface ChatMessage {
  id: string;
  fromId: string;
  toId: string;
  /** May be empty when the message is just a file. */
  body: string;
  createdAt: string;
  readAt: string | null;
  /** A file sent with it; fetch it from attachmentUrl(message.id). */
  attachment: { name: string; type: string; size: number } | null;
}

export interface ChatContact {
  user: { id: string; name: string };
  relations: ('friend' | 'coach' | 'client')[];
  last: { body: string; createdAt: string; fromMe: boolean } | null;
  unread: number;
}
