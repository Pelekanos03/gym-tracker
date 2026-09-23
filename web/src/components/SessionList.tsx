import { useState } from 'react';
import type { WorkoutSession } from '../types';
import { SET_TYPE_LABELS } from '../types';
import { SessionEditor } from './SessionEditor';

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
        // Matches the backend rule: every set type counts toward volume except warm-ups.
        const countsTowardVolume = s.sets.filter((set) => set.setType !== 'WARMUP');
        const volume = countsTowardVolume.reduce((sum, x) => sum + x.weight * x.reps, 0);
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
                    <tr key={set.id}>
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
