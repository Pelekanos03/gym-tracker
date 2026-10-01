import type {
  ClientLink,
  CoachLink,
  CoachingRequest,
  Exercise,
  ExerciseProgress,
  FriendEntry,
  FeedbackItem,
  FriendRequest,
  Program,
  BodyWeightEntry,
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
  if (res.status === 401 && !path.startsWith('/auth/')) {
    // Session expired or revoked: tell the app to show the login screen.
    window.dispatchEvent(new Event(SESSION_EXPIRED));
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `${res.status} ${res.statusText}`);
  }
  // An empty body (204, or a handler returning null) comes back as null.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Fired on any 401 from the API; App listens and drops back to the login screen. */
export const SESSION_EXPIRED = 'gym-app:session-expired';

/**
 * Streams a set's video. The session cookie rides along automatically, so
 * a plain <video src> works; the API only serves it to the lifter or their coach.
 */
export function videoUrl(setId: string): string {
  return `${BASE}/set-logs/${setId}/video`;
}

/**
 * One object grouping every backend call. Components never build URLs
 * themselves — they ask this client.
 */
export const api = {
  listUsers: (q?: string) => request<User[]>(`/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  /** Sign up; also logs you in. */
  createUser: (data: {
    name: string;
    email: string;
    password: string;
    acceptTerms: boolean;
    inviteCode?: string;
  }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),

  /** Sets the httpOnly session cookie. */
  login: (data: { email: string; password: string }) =>
    request<User>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  /** Whether sign-up needs an invite code (closed beta). */
  authConfig: () => request<{ inviteRequired: boolean; maxVideoMb: number }>('/auth/config'),

  forgotPassword: (email: string) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  /** Sets a new password from an emailed link, and logs you in. */
  resetPassword: (token: string, password: string) =>
    request<User>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  // --- feedback ---
  sendFeedback: (message: string, page: string) =>
    request('/feedback', { method: 'POST', body: JSON.stringify({ message, page }) }),

  /** Admins only (ADMIN_EMAILS on the server). */
  listFeedback: () => request<FeedbackItem[]>('/feedback'),

  // --- account ---
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/account/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  /** Deletes the account and all its data, for good. */
  deleteAccount: (password: string) =>
    request('/account', { method: 'DELETE', body: JSON.stringify({ password }) }),

  /** Who the session cookie belongs to; throws if not logged in. */
  me: () => request<User>('/auth/me'),

  /** Built-in exercises plus the ones this user added (theirs alone). */
  listExercises: (userId: string) => request<Exercise[]>(`/exercises?userId=${userId}`),

  createExercise: (data: {
    ownerId: string;
    name: string;
    category: string;
    primaryMuscle: string;
    isCompetitionLift?: boolean;
  }) => request<Exercise>('/exercises', { method: 'POST', body: JSON.stringify(data) }),

  /** What deleting one of your own exercises would also delete. */
  deleteExercisePreview: (id: string) =>
    request<{ setLogCount: number; programExerciseCount: number; usedByOthers: boolean }>(
      `/exercises/${id}/delete-preview`,
    ),

  deleteExercise: (id: string) => request(`/exercises/${id}`, { method: 'DELETE' }),

  mergeExercisesPreview: (keepId: string, mergeId: string, userId: string) =>
    request<{ programExerciseCount: number; setLogCount: number }>(
      `/exercises/merge-preview?keepId=${keepId}&mergeId=${mergeId}&userId=${userId}`,
    ),

  mergeExercises: (keepId: string, mergeId: string, userId: string) =>
    request<Exercise>('/exercises/merge', {
      method: 'POST',
      body: JSON.stringify({ keepId, mergeId, userId }),
    }),

  // --- set videos ---
  /**
   * Multipart upload, so it skips request()'s JSON Content-Type (the
   * browser sets the multipart boundary itself). XHR rather than fetch
   * because fetch can't report upload progress, and phone clips are big.
   */
  uploadSetVideo: (
    setId: string,
    userId: string,
    file: File,
    onProgress?: (fraction: number) => void,
  ) =>
    new Promise<{ id: string; videoFile: string }>((resolve, reject) => {
      const form = new FormData();
      form.append('video', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/set-logs/${setId}/video?userId=${userId}`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onload = () => {
        let body: { message?: string } = {};
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          // non-JSON error page
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(body as { id: string; videoFile: string });
        else
          reject(
            new Error(
              xhr.status === 413
                ? 'That video is too big — try a shorter clip.'
                : (body.message ?? `Upload failed (${xhr.status})`),
            ),
          );
      };
      xhr.onerror = () => reject(new Error('Upload failed — check your connection.'));
      xhr.send(form);
    }),

  removeSetVideo: (setId: string, userId: string) =>
    request(`/set-logs/${setId}/video`, { method: 'DELETE', body: JSON.stringify({ userId }) }),

  // --- body weight ---
  bodyWeight: (userId: string) => request<BodyWeightEntry[]>(`/users/${userId}/body-weight`),

  logBodyWeight: (userId: string, data: { date: string; weight: number }) =>
    request<BodyWeightEntry>(`/users/${userId}/body-weight`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteBodyWeight: (userId: string, id: string) =>
    request(`/users/${userId}/body-weight/${id}`, { method: 'DELETE' }),

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
