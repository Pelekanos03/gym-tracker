import { Fragment, useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import type { SetType, WorkoutSession } from '../types';
import { SET_TYPE_LABELS } from '../types';
import {
  DropRows,
  SupersetRows,
  dropsPayload,
  emptyDrop,
  emptyPartner,
  partnersPayload,
  type DropEntry,
  type PartnerEntry,
} from './SetExtras';

const SET_TYPES: SetType[] = ['WORKING', 'WARMUP', 'DROP_SET', 'SUPERSET', 'BACKOFF', 'AMRAP'];

interface SetRow {
  exerciseId: string;
  weight: string;
  reps: string;
  rpe: string;
  setType: SetType;
  drops: DropEntry[];
  supersetPartners: PartnerEntry[];
}

function rowsFromSession(session: WorkoutSession): SetRow[] {
  return session.sets.map((s) => ({
    exerciseId: s.exercise.id,
    weight: String(s.weight),
    reps: String(s.reps),
    rpe: s.rpe != null ? String(s.rpe) : '',
    setType: s.setType,
    drops: [...(s.drops ?? [])]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((d) => ({ weight: String(d.weight), reps: String(d.reps) })),
    supersetPartners: [...(s.supersetPartners ?? [])]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((p) => ({ exerciseId: p.exercise.id, weight: String(p.weight), reps: String(p.reps) })),
  }));
}

/** Edits an already-logged session: date, notes, and its full set of sets. */
export function SessionEditor({
  session,
  userId,
  onSaved,
  onCancel,
}: {
  session: WorkoutSession;
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const exercises = useAsync(() => api.listExercises(), []);
  const [date, setDate] = useState(session.date);
  const [notes, setNotes] = useState(session.notes);
  const [rows, setRows] = useState<SetRow[]>(rowsFromSession(session));
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  function update(i: number, patch: Partial<SetRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  /** Switching a set to "Drop set" or "Superset" opens one empty sub-row straight away. */
  function changeSetType(i: number, setType: SetType) {
    const r = rows[i];
    update(i, {
      setType,
      drops: setType === 'DROP_SET' && r.drops.length === 0 ? [emptyDrop()] : r.drops,
      supersetPartners:
        setType === 'SUPERSET' && r.supersetPartners.length === 0 ? [emptyPartner()] : r.supersetPartners,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const usable = rows.filter((r) => r.exerciseId && r.reps);
    if (usable.length === 0) {
      setError('Keep at least one set with an exercise and reps.');
      return;
    }
    setBusy(true);
    try {
      const perExercise = new Map<string, number>();
      await api.updateSession(session.id, {
        userId,
        programDayId: session.programDay?.id,
        date,
        notes: notes || undefined,
        status: session.status,
        sets: usable.map((r) => {
          const n = (perExercise.get(r.exerciseId) ?? 0) + 1;
          perExercise.set(r.exerciseId, n);
          return {
            exerciseId: r.exerciseId,
            setNumber: n,
            weight: r.weight ? Number(r.weight) : 0,
            reps: Number(r.reps),
            rpe: r.rpe ? Number(r.rpe) : undefined,
            setType: r.setType,
            drops: r.setType === 'DROP_SET' ? dropsPayload(r.drops) : undefined,
            supersetPartners:
              r.setType === 'SUPERSET' ? partnersPayload(r.supersetPartners) : undefined,
          };
        }),
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="panel"
      style={{ background: 'var(--panel-2)', marginTop: '.6rem' }}
    >
      <h3>Edit session</h3>
      {error && <div className="err">{error}</div>}
      <div className="row">
        <div>
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div style={{ flex: 3 }}>
          <label>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="table-scroll" style={{ marginTop: '.5rem' }}>
      <table>
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Weight (kg)</th>
            <th>Reps</th>
            <th>RPE</th>
            <th>Set type</th>
            <th
              style={{ position: 'sticky', right: 0, background: 'var(--panel-2)' }}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <Fragment key={i}>
            <tr>
              <td>
                <select
                  value={r.exerciseId}
                  onChange={(e) => update(i, { exerciseId: e.target.value })}
                >
                  <option value="">— pick —</option>
                  {(exercises.data ?? []).map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={r.weight}
                  onChange={(e) => update(i, { weight: e.target.value })}
                  style={{ width: 80 }}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  value={r.reps}
                  onChange={(e) => update(i, { reps: e.target.value })}
                  style={{ width: 64 }}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={r.rpe}
                  onChange={(e) => update(i, { rpe: e.target.value })}
                  style={{ width: 64 }}
                />
              </td>
              <td>
                <select
                  value={r.setType}
                  onChange={(e) => changeSetType(i, e.target.value as SetType)}
                  style={{ minWidth: 110 }}
                >
                  {SET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {SET_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </td>
              <td style={{ position: 'sticky', right: 0, background: 'var(--panel-2)' }}>
                <button
                  type="button"
                  className="ghost small"
                  title="Remove this set"
                  onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                  disabled={rows.length === 1}
                >
                  ✕
                </button>
              </td>
            </tr>
            {(r.setType === 'DROP_SET' || r.setType === 'SUPERSET') && (
              <tr>
                <td colSpan={6}>
                  {r.setType === 'DROP_SET' ? (
                    <DropRows drops={r.drops} onChange={(drops) => update(i, { drops })} />
                  ) : (
                    <SupersetRows
                      partners={r.supersetPartners}
                      exercises={exercises.data ?? []}
                      onChange={(supersetPartners) => update(i, { supersetPartners })}
                    />
                  )}
                </td>
              </tr>
            )}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>

      <div className="row" style={{ marginTop: '.75rem' }}>
        <button
          type="button"
          className="ghost"
          onClick={() =>
            setRows((rs) => [
              ...rs,
              { exerciseId: '', weight: '', reps: '', rpe: '', setType: 'WORKING', drops: [], supersetPartners: [] },
            ])
          }
        >
          + Add set
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
        <button disabled={busy}>Save changes</button>
      </div>
    </form>
  );
}
