import type { WorkoutSession } from '../types';

/** Read-only render of logged sessions and their sets. */
export function SessionList({ sessions }: { sessions: WorkoutSession[] }) {
  if (sessions.length === 0) {
    return <p className="muted">No sessions logged yet.</p>;
  }

  return (
    <>
      {sessions.map((s) => {
        const working = s.sets.filter((set) => !set.isWarmup);
        const volume = working.reduce((sum, x) => sum + x.weight * x.reps, 0);
        return (
          <div
            key={s.id}
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '.6rem',
              marginTop: '.6rem',
            }}
          >
            <strong>{s.date}</strong>{' '}
            <span className="tag">{s.status}</span>{' '}
            <span className="muted">· volume {volume.toLocaleString()} kg</span>
            {s.notes && <div className="muted">“{s.notes}”</div>}
            <table style={{ marginTop: '.4rem' }}>
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
                      {set.isWarmup && (
                        <span className="muted"> (warm-up)</span>
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
        );
      })}
    </>
  );
}
