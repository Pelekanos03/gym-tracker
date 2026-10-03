import { useState } from 'react';
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
import { arrayMove } from '@dnd-kit/sortable';
import { newKey } from '../keys';
import { SortableItem, SortableList } from './Sortable';
import { SwipeToDelete } from './SwipeToDelete';
import { ExercisePicker } from './ExercisePicker';
import { decimalInput } from '../decimal';

const SET_TYPES: SetType[] = ['WORKING', 'WARMUP', 'DROP_SET', 'SUPERSET', 'BACKOFF', 'AMRAP'];

interface SetRow {
  /** Stable key for drag-and-drop. */
  id: string;
  exerciseId: string;
  weight: string;
  reps: string;
  rpe: string;
  setType: SetType;
  drops: DropEntry[];
  supersetPartners: PartnerEntry[];
  /** An already-uploaded video; sent back so saving the edit keeps it. */
  videoFile?: string | null;
  /** Its comment — sent back too, or editing the session would wipe it. */
  videoNote?: string | null;
}

function rowsFromSession(session: WorkoutSession): SetRow[] {
  return session.sets.map((s) => ({
    id: newKey(),
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
    videoFile: s.videoFile,
    videoNote: s.videoNote,
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
  const exercises = useAsync(() => api.listExercises(userId), [userId]);
  const [date, setDate] = useState(session.date);
  const [notes, setNotes] = useState(session.notes);
  const [rows, setRows] = useState<SetRow[]>(rowsFromSession(session));
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  function move(from: string, to: string) {
    setRows((rs) => {
      const i = rs.findIndex((x) => x.id === from);
      const j = rs.findIndex((x) => x.id === to);
      return i < 0 || j < 0 ? rs : arrayMove(rs, i, j);
    });
  }

  function remove(i: number) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, idx) => idx !== i)));
  }

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
            videoFile: r.videoFile ?? undefined,
            videoNote: r.videoNote ?? undefined,
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
      <div className="panel-head editor-head">
        <h3>Edit session</h3>
        <button type="button" className="ghost small" onClick={onCancel}>
          ✕ Close
        </button>
      </div>
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

      {/* Same as logging: drag the ⋮⋮ grip to reorder; on a phone swipe a set to delete it. */}
      <div className="edit-grid">
        <div className="edit-grid-head">
          <span />
          <span>Exercise</span>
          <span>Weight (kg)</span>
          <span>Reps</span>
          <span>RPE</span>
          <span>Set type</span>
          <span />
        </div>
        <SortableList ids={rows.map((x) => x.id)} onMove={move}>
          {rows.map((r, i) => (
            <SortableItem key={r.id} id={r.id}>
              {(handle) => (
                <>
                  <SwipeToDelete onDelete={() => remove(i)}>
                    <div className="edit-row">
                      {handle}
                      <div className="edit-exercise">
                        <ExercisePicker
                          exercises={exercises.data ?? []}
                          value={r.exerciseId}
                          onChange={(id) => update(i, { exerciseId: id })}
                        />
                      </div>
                      <div className="edit-field">
                        <label className="line-label">kg</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          min={0}
                          step={0.5}
                          value={r.weight}
                          onChange={(e) => update(i, { weight: decimalInput(e.target.value) })}
                        />
                      </div>
                      <div className="edit-field">
                        <label className="line-label">reps</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={r.reps}
                          onChange={(e) => update(i, { reps: e.target.value })}
                        />
                      </div>
                      <div className="edit-field">
                        <label className="line-label">RPE</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          min={1}
                          max={10}
                          step={0.5}
                          value={r.rpe}
                          onChange={(e) => update(i, { rpe: decimalInput(e.target.value) })}
                        />
                      </div>
                      <select
                        className="edit-type"
                        value={r.setType}
                        onChange={(e) => changeSetType(i, e.target.value as SetType)}
                        aria-label="Set type"
                      >
                        {SET_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {SET_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="ghost small desktop-only"
                        title="Remove this set"
                        onClick={() => remove(i)}
                        disabled={rows.length === 1}
                      >
                        ✕
                      </button>
                    </div>
                  </SwipeToDelete>
                  {(r.setType === 'DROP_SET' || r.setType === 'SUPERSET') && (
                    <div className="set-extras">
                      {r.setType === 'DROP_SET' ? (
                        <DropRows drops={r.drops} onChange={(drops) => update(i, { drops })} />
                      ) : (
                        <SupersetRows
                          partners={r.supersetPartners}
                          exercises={exercises.data ?? []}
                          onChange={(supersetPartners) => update(i, { supersetPartners })}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </SortableItem>
          ))}
        </SortableList>
      </div>

      <div className="row stack-on-phone" style={{ marginTop: '.75rem' }}>
        <button
          type="button"
          className="ghost"
          onClick={() =>
            setRows((rs) => [
              ...rs,
              { id: newKey(), exerciseId: '', weight: '', reps: '', rpe: '', setType: 'WORKING', drops: [], supersetPartners: [] },
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
