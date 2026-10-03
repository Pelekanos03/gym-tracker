import type { SetLog, WorkoutSession } from './types';

/**
 * Pure helpers shared by History and Stats. Everything here works off the
 * sessions the client already has — no extra API calls.
 */

/** Weight moved by one set incl. its drops / superset partners (kg). */
export function setVolume(set: SetLog): number {
  return [set, ...(set.drops ?? []), ...(set.supersetPartners ?? [])].reduce(
    (v, part) => v + part.weight * part.reps,
    0,
  );
}

/** Matches the backend rule: every set type counts toward volume except warm-ups. */
export function sessionVolume(session: WorkoutSession): number {
  return session.sets
    .filter((s) => s.setType !== 'WARMUP')
    .reduce((sum, s) => sum + setVolume(s), 0);
}

/**
 * A session's sets gathered per exercise, in the order each exercise was
 * first done. Not just consecutive runs: a circuit (A, B, A, B…) is still
 * two exercises, not four.
 */
export function groupByExercise(sets: SetLog[]): { exerciseId: string; name: string; sets: SetLog[] }[] {
  const groups = new Map<string, { exerciseId: string; name: string; sets: SetLog[] }>();
  for (const set of sets) {
    const group = groups.get(set.exercise.id);
    if (group) group.sets.push(set);
    else groups.set(set.exercise.id, { exerciseId: set.exercise.id, name: set.exercise.name, sets: [set] });
  }
  return [...groups.values()];
}

/** "5 × 100 kg" style one-liner for a group: the heaviest non-warm-up set. */
export function topSetLabel(sets: SetLog[]): string {
  const working = sets.filter((s) => s.setType !== 'WARMUP');
  const pool = working.length > 0 ? working : sets;
  const top = pool.reduce((best, s) =>
    s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best,
  );
  return top.weight > 0 ? `${top.weight} kg × ${top.reps}` : `${top.reps} reps`;
}

/** Parse a YYYY-MM-DD as a local date (not UTC midnight, which can shift the day). */
export function parseDay(day: string): Date {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDayString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayString(): string {
  return toDayString(new Date());
}

/** Monday of the week containing `d`. */
export function weekStart(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const DAY_MONTH = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const DAY_MONTH_YEAR = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "Tue 29 Sep" (adds the year when it isn't this year). */
export function formatDay(day: string): string {
  const d = parseDay(day);
  const fmt = d.getFullYear() === new Date().getFullYear() ? DAY_MONTH : DAY_MONTH_YEAR;
  return `${WEEKDAY.format(d)} ${fmt.format(d)}`;
}

export function formatShortDay(day: string): string {
  return DAY_MONTH.format(parseDay(day));
}

/** "Today", "Yesterday", "3 days ago", "2 weeks ago"… */
export function relativeDay(day: string): string {
  const diff = Math.round(
    (parseDay(todayString()).getTime() - parseDay(day).getTime()) / 86_400_000,
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 0) return `In ${-diff} day${diff === -1 ? '' : 's'}`;
  if (diff < 14) return `${diff} days ago`;
  if (diff < 60) return `${Math.floor(diff / 7)} weeks ago`;
  return `${Math.floor(diff / 30)} months ago`;
}

/** Body weight always with 2 decimals: 81.25 */
export function kg2(n: number): string {
  return n.toFixed(2);
}

/** 1,284 / 12.9K / 1.2M */
export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

export function completed(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((s) => s.status !== 'SKIPPED');
}

/** Consecutive weeks (ending this week or last) with at least one session. */
export function weekStreak(sessions: WorkoutSession[]): number {
  const weeks = new Set(completed(sessions).map((s) => weekStart(parseDay(s.date)).getTime()));
  let cursor = weekStart(new Date());
  // This week not trained yet doesn't break the streak — it isn't over.
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export interface WeekBucket {
  /** Monday, YYYY-MM-DD */
  week: string;
  label: string;
  volume: number;
  sessions: number;
  sets: number;
}

/** The last `count` weeks, oldest first, empty weeks included. */
export function weeklyBuckets(sessions: WorkoutSession[], count: number): WeekBucket[] {
  const thisWeek = weekStart(new Date());
  const buckets: WeekBucket[] = [];
  const index = new Map<number, WeekBucket>();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    const bucket = {
      week: toDayString(d),
      label: DAY_MONTH.format(d),
      volume: 0,
      sessions: 0,
      sets: 0,
    };
    buckets.push(bucket);
    index.set(d.getTime(), bucket);
  }
  for (const s of completed(sessions)) {
    const bucket = index.get(weekStart(parseDay(s.date)).getTime());
    if (!bucket) continue;
    bucket.volume += sessionVolume(s);
    bucket.sessions += 1;
    bucket.sets += s.sets.filter((x) => x.setType !== 'WARMUP').length;
  }
  return buckets;
}

/**
 * Hard sets per body part within the last `days` days. A superset
 * partner counts toward its own exercise's muscle.
 */
export function setsByMuscle(
  sessions: WorkoutSession[],
  days: number,
): { muscle: string; sets: number; volume: number }[] {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const totals = new Map<string, { sets: number; volume: number }>();
  const add = (muscle: string, volume: number) => {
    const t = totals.get(muscle) ?? { sets: 0, volume: 0 };
    t.sets += 1;
    t.volume += volume;
    totals.set(muscle, t);
  };
  for (const s of completed(sessions)) {
    if (parseDay(s.date) < since) continue;
    for (const set of s.sets) {
      if (set.setType === 'WARMUP') continue;
      const own =
        set.weight * set.reps + (set.drops ?? []).reduce((v, d) => v + d.weight * d.reps, 0);
      add(set.exercise.primaryMuscle, own);
      for (const p of set.supersetPartners ?? []) add(p.exercise.primaryMuscle, p.weight * p.reps);
    }
  }
  return [...totals.entries()]
    .map(([muscle, t]) => ({ muscle, ...t }))
    .sort((a, b) => b.sets - a.sets);
}

/** "Bench Press · set 2 · 80 kg × 5" — what's in the clip. */
export function setTitle(set: Pick<SetLog, 'exercise' | 'weight' | 'reps'>, n?: number): string {
  const parts = [set.exercise.name];
  if (n) parts.push(`set ${n}`);
  parts.push(set.weight > 0 ? `${set.weight} kg × ${set.reps}` : `${set.reps} reps`);
  return parts.join(' · ');
}

/** Is a reading due? Daily: none today. Weekly: none in the last 7 days. */
export function weightReminderDue(
  reminder: 'off' | 'daily' | 'weekly',
  entries: { date: string }[],
): boolean {
  if (reminder === 'off') return false;
  const last = entries[entries.length - 1];
  if (!last) return true;
  const days = Math.round((parseDay(todayString()).getTime() - parseDay(last.date).getTime()) / 86_400_000);
  return reminder === 'daily' ? days >= 1 : days >= 7;
}

/** 1:05:30 / 25:30 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** Pace for on-foot activities (5:12 /km), speed for the rest (24.5 km/h). */
export function paceOrSpeed(activity: string, seconds: number, km: number | null): string | null {
  if (!km || km <= 0) return null;
  if (activity === 'run' || activity === 'walk') {
    const perKm = Math.round(seconds / km);
    return `${Math.floor(perKm / 60)}:${String(perKm % 60).padStart(2, '0')} /km`;
  }
  return `${(km / (seconds / 3600)).toFixed(1)} km/h`;
}
