// Mirrors the shapes the NestJS API returns. Kept deliberately small.

export type UserRole = 'COACH' | 'CLIENT';
export type Discipline = 'POWERLIFTING' | 'BODYBUILDING' | 'BOTH';
export type ExerciseCategory = 'COMPOUND' | 'ISOLATION';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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

export interface RosterEntry {
  relationshipId: string;
  since: string;
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
  coach: User;
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
  isWarmup: boolean;
}

export interface WorkoutSession {
  id: string;
  client: User;
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
