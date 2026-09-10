import { useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import type { Discipline } from '../types';

interface Line {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetRpe: string;
  targetPercent1rm: string;
  notes: string;
}

const emptyLine: Line = {
  exerciseId: '',
  targetSets: 3,
  targetReps: 5,
  targetRpe: '',
  targetPercent1rm: '',
  notes: '',
};

/**
 * Minimal single-day program builder. Enough to create a real program with
 * prescribed sets/reps/RPE; extend to multi-week/multi-day from here.
 */
export function ProgramBuilder({
  coachId,
  onCreated,
}: {
  coachId: string;
  onCreated: () => void;
}) {
  const exercises = useAsync(() => api.listExercises(), []);
  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('POWERLIFTING');
  const [dayName, setDayName] = useState('Day 1');
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const usable = lines.filter((l) => l.exerciseId);
    if (!name || usable.length === 0) {
      setError('Give the program a name and at least one exercise.');
      return;
    }
    setBusy(true);
    try {
      await api.createProgram({
        coachId,
        name,
        discipline,
        lengthWeeks: 4,
        days: [
          {
            weekNumber: 1,
            dayNumber: 1,
            name: dayName,
            exercises: usable.map((l, idx) => ({
              exerciseId: l.exerciseId,
              orderIndex: idx + 1,
              targetSets: Number(l.targetSets),
              targetReps: Number(l.targetReps),
              targetRpe: l.targetRpe ? Number(l.targetRpe) : undefined,
              targetPercent1rm: l.targetPercent1rm
                ? Number(l.targetPercent1rm)
                : undefined,
              notes: l.notes || undefined,
            })),
          },
        ],
      });
      setName('');
      setLines([{ ...emptyLine }]);
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="err">{error}</div>}
      <div className="row">
        <div>
          <label>Program name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>Focus</label>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as Discipline)}
          >
            <option value="POWERLIFTING">Powerlifting</option>
            <option value="BODYBUILDING">Bodybuilding</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <div>
          <label>Day label</label>
          <input value={dayName} onChange={(e) => setDayName(e.target.value)} />
        </div>
      </div>

      <table style={{ marginTop: '.5rem' }}>
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Sets</th>
            <th>Reps</th>
            <th>RPE</th>
            <th>% 1RM</th>
            <th>Notes</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td>
                <select
                  value={l.exerciseId}
                  onChange={(e) =>
                    updateLine(i, { exerciseId: e.target.value })
                  }
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
                  min={1}
                  value={l.targetSets}
                  onChange={(e) =>
                    updateLine(i, { targetSets: Number(e.target.value) })
                  }
                  style={{ width: 56 }}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={1}
                  value={l.targetReps}
                  onChange={(e) =>
                    updateLine(i, { targetReps: Number(e.target.value) })
                  }
                  style={{ width: 56 }}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={l.targetRpe}
                  onChange={(e) => updateLine(i, { targetRpe: e.target.value })}
                  style={{ width: 56 }}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={l.targetPercent1rm}
                  onChange={(e) =>
                    updateLine(i, { targetPercent1rm: e.target.value })
                  }
                  style={{ width: 64 }}
                />
              </td>
              <td>
                <input
                  value={l.notes}
                  onChange={(e) => updateLine(i, { notes: e.target.value })}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="ghost small"
                  onClick={() =>
                    setLines((ls) => ls.filter((_, idx) => idx !== i))
                  }
                  disabled={lines.length === 1}
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
          onClick={() => setLines((ls) => [...ls, { ...emptyLine }])}
        >
          + Add exercise
        </button>
        <button disabled={busy}>Create program</button>
      </div>
    </form>
  );
}
