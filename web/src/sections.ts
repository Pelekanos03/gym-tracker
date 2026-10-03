/** The app's main sections — top tabs on desktop, the ☰ menu on a phone. */
export type Tab = 'log' | 'cardio' | 'history' | 'stats' | 'programs' | 'friends' | 'messages';

export const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: 'Workout' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'history', label: 'History' },
  { id: 'stats', label: 'Stats' },
  { id: 'programs', label: 'Programs' },
  { id: 'friends', label: 'Friends' },
  { id: 'messages', label: 'Messages' },
];

/** Counts shown as badges on sections (top tabs and the phone menu). */
export interface Badges {
  friends: number;
  messages: number;
}
