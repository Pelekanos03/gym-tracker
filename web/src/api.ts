import type {
  Exercise,
  ExerciseProgress,
  Program,
  RosterEntry,
  User,
  UserRole,
  WorkoutSession,
} from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `${res.status} ${res.statusText}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/**
 * One object grouping every backend call. Components never build URLs
 * themselves — they ask this client.
 */
export const api = {
  listUsers: (role?: UserRole) =>
    request<User[]>(`/users${role ? `?role=${role}` : ''}`),

  createUser: (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) => request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),

  listExercises: () => request<Exercise[]>('/exercises'),

  // --- coaching ---
  roster: (coachId: string) =>
    request<RosterEntry[]>(`/coaches/${coachId}/clients`),

  addClient: (coachId: string, clientId: string) =>
    request(`/coaches/${coachId}/clients`, {
      method: 'POST',
      body: JSON.stringify({ clientId }),
    }),

  // --- programs ---
  listPrograms: (coachId: string) =>
    request<Program[]>(`/programs?coachId=${coachId}`),

  getProgram: (id: string) => request<Program>(`/programs/${id}`),

  createProgram: (data: unknown) =>
    request<Program>('/programs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  assignProgram: (
    programId: string,
    data: { coachId: string; clientId: string; startDate?: string },
  ) =>
    request(`/programs/${programId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // --- workouts ---
  logSession: (data: unknown) =>
    request<WorkoutSession>('/workout-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  clientHistory: (clientId: string) =>
    request<WorkoutSession[]>(`/clients/${clientId}/workout-sessions`),

  coachViewHistory: (coachId: string, clientId: string) =>
    request<WorkoutSession[]>(
      `/coaches/${coachId}/clients/${clientId}/workout-sessions`,
    ),

  // --- progress ---
  clientProgress: (clientId: string) =>
    request<ExerciseProgress[]>(`/clients/${clientId}/progress`),

  coachViewProgress: (coachId: string, clientId: string) =>
    request<ExerciseProgress[]>(
      `/coaches/${coachId}/clients/${clientId}/progress`,
    ),
};
