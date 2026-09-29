import { Fragment, useState } from 'react';
import type { WorkoutSession } from '../types';
import { SET_TYPE_LABELS } from '../types';
import { SessionEditor } from './SessionEditor';

/** Drops / superset partners in the order they were done (the API doesn't guarantee it). */
function byOrder<T extends { orderIndex: number }>(items: T[] | undefined): T[] {
  return [...(items ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
}

/** Read-only render of logged sessions and their sets, with optional edit/delete. */
export function SessionList({
  sessions,
  userId,
  onDelete,
  onChanged,
}: {
  sessions: WorkoutSession[];
  userId?: string;
  onDelete?: (id: string) => Promise<void>;
  onChanged?: () => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string>();
  const [editingId, setEditingId] = useState<string>();

  if (sessions.length === 0) {
    return <p className="muted">No sessions logged yet.</p>;
  }

  return (
    <>
      {sessions.map((s) => {
        // Matches the backend rule: every set type counts toward volume except
        // warm-ups, and drops / superset partners count on top of their set.
        const countsTowardVolume = s.sets.filter((set) => set.setType !== 'WARMUP');
        const volume = countsTowardVolume.reduce(
          (sum, x) =>
            sum +
            [x, ...(x.drops ?? []), ...(x.supersetPartners ?? [])].reduce(
              (v, part) => v + part.weight * part.reps,
              0,
            ),
          0,
        );
        return (
          <div
            key={s.id}
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '.6rem',
              marginTop: '.6rem',
            }}
          >
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{s.date}</strong>{' '}
                <span className="tag">{s.status}</span>{' '}
                <span className="muted">· volume {volume.toLocaleString()} kg</span>
                {s.notes && <div className="muted">“{s.notes}”</div>}
              </div>
              {(userId || onDelete) && (
                <div style={{ flex: '0 0 auto' }}>
                  {confirmingId === s.id ? (
                    <>
                      <button
                        className="small"
                        onClick={() => {
                          onDelete?.(s.id);
                          setConfirmingId(undefined);
                        }}
                      >
                        Confirm delete
                      </button>{' '}
                      <button
                        className="ghost small"
                        onClick={() => setConfirmingId(undefined)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {userId && (
                        <button
                          className="ghost small"
                          onClick={() =>
                            setEditingId(editingId === s.id ? undefined : s.id)
                          }
                        >
                          {editingId === s.id ? 'Close' : 'Edit'}
                        </button>
                      )}{' '}
                      {onDelete && (
                        <button
                          className="ghost small"
                          onClick={() => setConfirmingId(s.id)}
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {editingId === s.id && userId && (
              <SessionEditor
                session={s}
                userId={userId}
                onCancel={() => setEditingId(undefined)}
                onSaved={() => {
                  setEditingId(undefined);
                  onChanged?.();
                }}
              />
            )}

            <div className="table-scroll" style={{ marginTop: '.4rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Exercise</th>
                    <th>Set</th>
                    <th>Weight</th>
                    <th>Reps</th>
                    <th>RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {s.sets.map((set) => (
                    <Fragment key={set.id}>
                      <tr>
                        <td>
                          {set.exercise.name}
                          {set.setType !== 'WORKING' && (
                            <span className="muted"> ({SET_TYPE_LABELS[set.setType].toLowerCase()})</span>
                          )}
                        </td>
                        <td>{set.setNumber}</td>
                        <td>{set.weight} kg</td>
                        <td>{set.reps}</td>
                        <td>{set.rpe ?? '—'}</td>
                      </tr>
                      {byOrder(set.drops).map((d) => (
                        <tr key={d.id} className="muted">
                          <td style={{ paddingLeft: '1.5rem' }}>↳ drop {d.orderIndex}</td>
                          <td />
                          <td>{d.weight} kg</td>
                          <td>{d.reps}</td>
                          <td />
                        </tr>
                      ))}
                      {byOrder(set.supersetPartners).map((p) => (
                        <tr key={p.id} className="muted">
                          <td style={{ paddingLeft: '1.5rem' }}>↳ + {p.exercise.name}</td>
                          <td />
                          <td>{p.weight} kg</td>
                          <td>{p.reps}</td>
                          <td />
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}
