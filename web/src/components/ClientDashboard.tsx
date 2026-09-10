import { useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import type { User } from '../types';
import { SessionList } from './SessionList';
import { ProgressPanel } from './ProgressPanel';

/**
 * What a client does here:
 *  1. log a training session (sets of weight x reps, optional RPE)
 *  2. review their own history
 *  3. see their estimated-1RM progress
 */
export function ClientDashboard({ client }: { client: User }) {
  const sessions = useAsync(() => api.clientHistory(client.id), [client.id]);
  const progress = useAsync(() => api.clientProgress(client.id), [client.id]);
  const [tab, setTab] = useState<'log' | 'history' | 'progress'>('log');

  function refreshAll() {
    sessions.reload();
    progress.reload();
  }

  return (
    <>
      <div className="tabs">
        <button
          className={tab === 'log' ? 'active' : ''}
          onClick={() => setTab('log')}
        >
          Log workout
        </button>
        <button
          className={tab === 'history' ? 'active' : ''}
          onClick={() => setTab('history')}
        >
          History
        </button>
        <button
          className={tab === 'progress' ? 'active' : ''}
          onClick={() => setTab('progress')}
        >
          Progress
        </button>
      </div>

      {tab === 'log' && (
        <div className="panel">
          <h2>Log a workout</h2>
          <LogWorkoutForm clientId={client.id} onLogged={refreshAll} />
        </div>
      )}

      {tab === 'history' && (
        <div className="panel">
          <h2>Your history</h2>
          {sessions.error && <div className="err">{sessions.error}</div>}
          <SessionList sessions={sessions.data ?? []} />
        </div>
      )}

      {tab === 'progress' && (
        <div className="panel">
          <h2>Your progress</h2>
          {progress.error && <div className="err">{progress.error}</div>}
          <ProgressPanel data={progress.data ?? []} />
        </div>
      )}
    </>
  );
}

interface SetRow {
  exerciseId: string;
  weight: string;
  reps: string;
  rpe: string;
  isWarmup: boolean;
}

const emptySet: SetRow = {
  exerciseId: '',
  weight: '',
  reps: '',
  rpe: '',
  isWarmup: false,
};

function LogWorkoutForm({
  clientId,
  onLogged,
}: {
  clientId: string;
  onLogged: () => void;
}) {
  const exercises = useAsync(() => api.listExercises(), []);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<SetRow[]>([{ ...emptySet }]);
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const [busy, setBusy] = useState(false);

  function update(i: number, patch: Partial<SetRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setOk(undefined);
    const usable = rows.filter((r) => r.exerciseId && r.weight && r.reps);
    if (usable.length === 0) {
      setError('Add at least one set with an exercise, weight and reps.');
      return;
    }
    setBusy(true);
    try {
      // Number each set per exercise so "set 1, set 2..." is meaningful.
      const perExercise = new Map<string, number>();
      await api.logSession({
        clientId,
        date,
        notes: notes || undefined,
        status: 'COMPLETED',
        sets: usable.map((r) => {
          const n = (perExercise.get(r.exerciseId) ?? 0) + 1;
          perExercise.set(r.exerciseId, n);
          return {
            exerciseId: r.exerciseId,
            setNumber: n,
            weight: Number(r.weight),
            reps: Number(r.reps),
            rpe: r.rpe ? Number(r.rpe) : undefined,
            isWarmup: r.isWarmup,
          };
        }),
      });
      setRows([{ ...emptySet }]);
      setNotes('');
      setOk('Session logged.');
      onLogged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="err">{error}</div>}
      {ok && <p className="pr">{ok}</p>}
      <div className="row">
        <div>
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div style={{ flex: 3 }}>
          <label>Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="how did it feel?"
          />
        </div>
      </div>

      <table style={{ marginTop: '.5rem' }}>
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Weight (kg)</th>
            <th>Reps</th>
            <th>RPE</th>
            <th>Warm-up</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
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
              <td style={{ textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={r.isWarmup}
                  onChange={(e) => update(i, { isWarmup: e.target.checked })}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="ghost small"
                  onClick={() =>
                    setRows((rs) => rs.filter((_, idx) => idx !== i))
                  }
                  disabled={rows.length === 1}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="row" style={{ marginTop: '.75rem' }}>
        <button
          type="button"
          className="ghost"
          onClick={() => setRows((rs) => [...rs, { ...emptySet }])}
        >
          + Add set
        </button>
        <button disabled={busy}>Log session</button>
      </div>
    </form>
  );
}
