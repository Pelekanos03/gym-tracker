import type { BodyWeightEntry, CardioSession, WorkoutSession } from './types';
import { SET_TYPE_LABELS, cardioLabel } from './types';

/**
 * CSV files that open cleanly in Excel / Google Sheets / Numbers: UTF-8
 * with a BOM (so Excel reads accents right), comma-separated, every
 * field quoted where needed.
 */
function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

export function download(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

/** One row per set — plus one per drop and per superset partner, marked in "Part". */
export function workoutsCsv(sessions: WorkoutSession[]): [string, string] {
  const rows: (string | number | null)[][] = [];
  for (const s of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    const perExercise = new Map<string, number>();
    for (const set of s.sets) {
      const n = (perExercise.get(set.exercise.id) ?? 0) + 1;
      perExercise.set(set.exercise.id, n);
      const base = [s.date, s.status.toLowerCase(), s.programDay?.name ?? '', s.notes];
      rows.push([...base, set.exercise.name, set.exercise.primaryMuscle, n, SET_TYPE_LABELS[set.setType], 'Set', set.weight, set.reps, set.rpe, set.videoFile ? 'yes' : '']);
      for (const d of [...(set.drops ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)) {
        rows.push([...base, set.exercise.name, set.exercise.primaryMuscle, n, SET_TYPE_LABELS[set.setType], `Drop ${d.orderIndex}`, d.weight, d.reps, null, '']);
      }
      for (const p of [...(set.supersetPartners ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)) {
        rows.push([...base, p.exercise.name, p.exercise.primaryMuscle, n, SET_TYPE_LABELS[set.setType], `Superset with ${set.exercise.name}`, p.weight, p.reps, null, '']);
      }
    }
  }
  return [
    `workouts-${stamp()}.csv`,
    toCsv(['Date', 'Status', 'Program day', 'Session notes', 'Exercise', 'Body part', 'Set', 'Set type', 'Part', 'Weight (kg)', 'Reps', 'RPE', 'Video'], rows),
  ];
}

export function bodyWeightCsv(entries: BodyWeightEntry[]): [string, string] {
  return [`body-weight-${stamp()}.csv`, toCsv(['Date', 'Weight (kg)'], entries.map((e) => [e.date, e.weight.toFixed(2)]))];
}

export function cardioCsv(sessions: CardioSession[]): [string, string] {
  return [
    `cardio-${stamp()}.csv`,
    toCsv(
      ['Date', 'Activity', 'Duration (min)', 'Distance (km)', 'Avg heart rate', 'Calories', 'Notes'],
      [...sessions]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => [s.date, cardioLabel(s.activity), (s.durationSeconds / 60).toFixed(2), s.distanceKm, s.avgHeartRate, s.calories, s.notes]),
    ),
  ];
}
