import type {
  ClientLink,
  CoachLink,
  CoachingRequest,
  Exercise,
  ExerciseProgress,
  FriendEntry,
  FriendRequest,
  Program,
  TrainingBlock,
  User,
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
  // An empty body (204, or a handler returning null) comes back as null.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/**
 * One object grouping every backend call. Components never build URLs
 * themselves — they ask this client.
 */
export const api = {
  listUsers: (q?: string) => request<User[]>(`/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  createUser: (data: { name: string; email: string; password: string }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<User>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  listExercises: () => request<Exercise[]>('/exercises'),

  createExercise: (data: {
    name: string;
    category: string;
    primaryMuscle: string;
    isCompetitionLift?: boolean;
  }) => request<Exercise>('/exercises', { method: 'POST', body: JSON.stringify(data) }),

  mergeExercisesPreview: (keepId: string, mergeId: string) =>
    request<{ programExerciseCount: number; setLogCount: number }>(
      `/exercises/merge-preview?keepId=${keepId}&mergeId=${mergeId}`,
    ),

  mergeExercises: (keepId: string, mergeId: string) =>
    request<Exercise>('/exercises/merge', {
      method: 'POST',
      body: JSON.stringify({ keepId, mergeId }),
    }),

  // --- friends ---
  friendsOf: (userId: string) => request<FriendEntry[]>(`/users/${userId}/friends`),

  friendRequests: (userId: string, direction: 'incoming' | 'outgoing') =>
    request<FriendRequest[]>(`/users/${userId}/friend-requests?direction=${direction}`),

  sendFriendRequest: (fromUserId: string, toUserId: string) =>
    request(`/friend-requests`, {
      method: 'POST',
      body: JSON.stringify({ fromUserId, toUserId }),
    }),

  acceptFriendRequest: (requestId: string, userId: string) =>
    request(`/friend-requests/${requestId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  declineFriendRequest: (requestId: string, userId: string) =>
    request(`/friend-requests/${requestId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }),

  unfriend: (friendshipId: string, userId: string) =>
    request(`/friendships/${friendshipId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }),

  // --- coaching (an elevated permission layered on an existing friendship) ---
  requestCoaching: (coachId: string, clientId: string) =>
    request<CoachingRequest>('/coaching-requests', {
      method: 'POST',
      body: JSON.stringify({ coachId, clientId }),
    }),

  coachingRequests: (userId: string, direction: 'incoming' | 'outgoing') =>
    request<CoachingRequest[]>(`/users/${userId}/coaching-requests?direction=${direction}`),

  acceptCoaching: (requestId: string, userId: string) =>
    request(`/coaching-requests/${requestId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  declineCoaching: (requestId: string, userId: string) =>
    request(`/coaching-requests/${requestId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }),

  endCoaching: (coachingId: string, userId: string) =>
    request(`/coachings/${coachingId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }),

  myCoaches: (userId: string) => request<CoachLink[]>(`/users/${userId}/coaches`),

  myClients: (userId: string) => request<ClientLink[]>(`/users/${userId}/clients`),

  clientPrograms: (viewerId: string, clientId: string) =>
    request<Program[]>(`/users/${viewerId}/clients/${clientId}/programs`),

  // --- programs ---
  listPrograms: (ownerId: string) => request<Program[]>(`/programs?ownerId=${ownerId}`),

  getProgram: (id: string) => request<Program>(`/programs/${id}`),

  createProgram: (data: unknown) =>
    request<Program>('/programs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProgram: (programId: string, data: unknown) =>
    request<Program>(`/programs/${programId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Coach-only: sends an independent, editable copy of one of your programs to a client you coach. */
  copyProgram: (programId: string, toUserId: string) =>
    request<Program>(`/programs/${programId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ toUserId }),
    }),

  deleteProgram: (programId: string, ownerId: string) =>
    request(`/programs/${programId}`, {
      method: 'DELETE',
      body: JSON.stringify({ ownerId }),
    }),

  /** Shares a program with a friend: they can view it and log against it, but it stays yours — no copy is made. */
  shareProgram: (programId: string, ownerId: string, friendId: string) =>
    request(`/programs/${programId}/share`, {
      method: 'POST',
      body: JSON.stringify({ ownerId, friendId }),
    }),

  unshareProgram: (programId: string, ownerId: string, friendId: string) =>
    request(`/programs/${programId}/share`, {
      method: 'DELETE',
      body: JSON.stringify({ ownerId, friendId }),
    }),

  programShares: (programId: string) =>
    request<{ id: string; sharedWith: User }[]>(`/programs/${programId}/shares`),

  activeBlock: (userId: string) =>
    request<TrainingBlock | null>(`/users/${userId}/training-blocks/active`),

  startBlock: (userId: string, programId: string) =>
    request<TrainingBlock>('/training-blocks', {
      method: 'POST',
      body: JSON.stringify({ userId, programId }),
    }),

  endBlock: (blockId: string, userId: string) =>
    request<TrainingBlock>(`/training-blocks/${blockId}/end`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  sharedPrograms: (userId: string) => request<Program[]>(`/users/${userId}/shared-programs`),

  // --- workouts ---
  logSession: (data: unknown) =>
    request<WorkoutSession>('/workout-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  myHistory: (userId: string) =>
    request<WorkoutSession[]>(`/users/${userId}/workout-sessions`),

  friendHistory: (viewerId: string, friendId: string) =>
    request<WorkoutSession[]>(`/users/${viewerId}/friends/${friendId}/workout-sessions`),

  updateSession: (sessionId: string, data: unknown) =>
    request<WorkoutSession>(`/workout-sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteSession: (sessionId: string, userId: string) =>
    request(`/workout-sessions/${sessionId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }),

  // --- progress ---
  myProgress: (userId: string) =>
    request<ExerciseProgress[]>(`/users/${userId}/progress`),

  friendProgress: (viewerId: string, friendId: string) =>
    request<ExerciseProgress[]>(`/users/${viewerId}/friends/${friendId}/progress`),
};
