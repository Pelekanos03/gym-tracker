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
  CardioSession,
  ChatContact,
  ChatMessage,
  TrainingBlock,
  User,
  WeightReminder,
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

/** Someone's profile picture; `version` changes with each new picture so it isn't cached stale. */
export function avatarUrl(userId: string, version: string): string {
  return `${BASE}/avatars/${userId}?v=${encodeURIComponent(version)}`;
}

/** A file sent in chat; only the two people in that chat can open it. */
export function attachmentUrl(messageId: string): string {
  return `${BASE}/messages/${messageId}/attachment`;
}

/**
 * Multipart POST with upload progress (XHR — fetch can't report it).
 * Shared by set videos and chat files.
 */
function uploadForm<T>(
  path: string,
  form: FormData,
  onProgress?: (fraction: number) => void,
  tooBig = 'That file is too big.',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BASE + path);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let body: { message?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON error page
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
      else
        reject(
          new Error(
            xhr.status === 413
              ? tooBig
              : (body.message ?? `Upload failed (${xhr.status})`),
          ),
        );
    };
    xhr.onerror = () => reject(new Error('Upload failed — check your connection.'));
    xhr.send(form);
  });
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
    healthConsent: boolean;
    consentPartners: boolean;
    consentAi: boolean;
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
  setPreferences: (prefs: { weightReminder: WeightReminder }) =>
    request<User>('/account/preferences', { method: 'POST', body: JSON.stringify(prefs) }),

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

  /** Built-ins can't be deleted (they're shared) — hide one from your own library instead. */
  hideExercise: (id: string) => request(`/exercises/${id}/hide`, { method: 'POST' }),

  unhideExercise: (id: string) => request(`/exercises/${id}/hide`, { method: 'DELETE' }),

  mergeExercisesPreview: (keepId: string, mergeId: string, userId: string) =>
    request<{ programExerciseCount: number; setLogCount: number }>(
      `/exercises/merge-preview?keepId=${keepId}&mergeId=${mergeId}&userId=${userId}`,
    ),

  mergeExercises: (keepId: string, mergeId: string, userId: string) =>
    request<Exercise>('/exercises/merge', {
      method: 'POST',
      body: JSON.stringify({ keepId, mergeId, userId }),
    }),

  // --- messages ---
  chatContacts: () => request<ChatContact[]>('/messages/contacts'),

  unreadMessages: () => request<{ count: number }>('/messages/unread-count'),

  /** Oldest → newest; `before` (ISO time) loads the page before that. Marks their messages read. */
  conversation: (otherId: string, before?: string) =>
    request<ChatMessage[]>(`/messages/with/${otherId}${before ? `?before=${encodeURIComponent(before)}` : ''}`),

  sendMessage: (toUserId: string, body: string) =>
    request<ChatMessage>('/messages', { method: 'POST', body: JSON.stringify({ toUserId, body }) }),

  /** Your profile picture (already shrunk to a small JPEG). Returns you, updated. */
  uploadAvatar: (picture: Blob) => {
    const form = new FormData();
    form.append('avatar', picture, 'avatar.jpg');
    return uploadForm<User>('/account/avatar', form, undefined, 'That picture is too big.');
  },

  removeAvatar: () => request<User>('/account/avatar', { method: 'DELETE' }),

  /** Change your privacy choices; only the ones given change. Returns you, updated. */
  setConsents: (choices: { health?: true; partners?: boolean; ai?: boolean }) =>
    request<User>('/account/consents', { method: 'POST', body: JSON.stringify(choices) }),

  /** A file (photo, PDF, document…) with optional text. */
  sendAttachment: (toUserId: string, file: File, body: string, onProgress?: (fraction: number) => void) => {
    const form = new FormData();
    form.append('toUserId', toUserId);
    if (body) form.append('body', body);
    form.append('file', file);
    return uploadForm<ChatMessage>('/messages/attachment', form, onProgress);
  },

  // --- cardio ---
  cardio: (userId: string) => request<CardioSession[]>(`/users/${userId}/cardio`),

  saveCardio: (userId: string, data: Omit<CardioSession, 'id'>, id?: string) =>
    request<CardioSession>(`/users/${userId}/cardio${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    }),

  deleteCardio: (userId: string, id: string) =>
    request(`/users/${userId}/cardio/${id}`, { method: 'DELETE' }),

  /** Your own activities ("Padel") — personal, nobody else sees them. */
  cardioActivities: (userId: string) => request<string[]>(`/users/${userId}/cardio/activities`),

  /** Replaces your list (add or remove one); returns it as saved. */
  setCardioActivities: (userId: string, activities: string[]) =>
    request<string[]>(`/users/${userId}/cardio/activities`, {
      method: 'PUT',
      body: JSON.stringify({ activities }),
    }),

  // --- workout in progress ---
  getWorkoutDraft: () => request<{ data: unknown; updatedAt: string } | null>('/workout-draft'),

  /**
   * keepalive lets the save finish even if the page is being closed —
   * so the very last tick before the phone locks still lands.
   */
  saveWorkoutDraft: (data: unknown) =>
    request<{ ok: boolean; updatedAt?: string }>('/workout-draft', {
      method: 'PUT',
      body: JSON.stringify({ data }),
      keepalive: true,
    }),

  clearWorkoutDraft: () => request('/workout-draft', { method: 'DELETE', keepalive: true }),

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
  ) => {
    const form = new FormData();
    form.append('video', file);
    return uploadForm<{ id: string; videoFile: string }>(
      `/set-logs/${setId}/video?userId=${userId}`,
      form,
      onProgress,
      'That video is too big — try a shorter clip.',
    );
  },

  /** The lifter's comment on a set's video; '' clears it. */
  setVideoNote: (setId: string, userId: string, note: string) =>
    request<{ id: string; videoNote: string | null }>(`/set-logs/${setId}/video-note`, {
      method: 'PATCH',
      body: JSON.stringify({ userId, note }),
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
