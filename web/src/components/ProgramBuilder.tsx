import { useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import type { Discipline, Program } from '../types';

interface Line {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetRpe: string;
  targetPercent1rm: string;
  targetWeight: string;
  notes: string;
}

const emptyLine: Line = {
  exerciseId: '',
  targetSets: 3,
  targetReps: 5,
  targetRpe: '',
  targetPercent1rm: '',
  targetWeight: '',
  notes: '',
};

interface DayForm {
  weekNumber: number;
  dayNumber: number;
  name: string;
  lines: Line[];
}

function newDay(weekNumber: number, dayNumber: number): DayForm {
  return {
    weekNumber,
    dayNumber,
    name: `Day ${dayNumber}`,
    lines: [{ ...emptyLine }],
  };
}

function daysFromProgram(program: Program): DayForm[] {
  return program.days.map((d) => ({
    weekNumber: d.weekNumber,
    dayNumber: d.dayNumber,
    name: d.name,
    lines: [...d.exercises]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((pe) => ({
        exerciseId: pe.exercise.id,
        targetSets: pe.targetSets,
        targetReps: pe.targetReps,
        targetRpe: pe.targetRpe != null ? String(pe.targetRpe) : '',
        targetPercent1rm: pe.targetPercent1rm != null ? String(pe.targetPercent1rm) : '',
        targetWeight: pe.targetWeight != null ? String(pe.targetWeight) : '',
        notes: pe.notes,
      })),
  }));
}

/**
 * Multi-week, multi-day program builder: add as many training days as the
 * plan needs, each with its own prescribed exercises (sets/reps/RPE/%1RM).
 * Pass `existing` to edit that program in place instead of creating a new one
 * — render with `key={existing?.id ?? 'new'}` from the parent so switching
 * targets (or back to "new") resets the form.
 */
export function ProgramBuilder({
  ownerId,
  existing,
  onCreated,
  onCancel,
}: {
  ownerId: string;
  existing?: Program;
  onCreated: () => void;
  onCancel?: () => void;
}) {
  const exercises = useAsync(() => api.listExercises(), []);
  const [name, setName] = useState(existing?.name ?? '');
  const [discipline, setDiscipline] = useState<Discipline>(existing?.discipline ?? 'POWERLIFTING');
  const [lengthWeeks, setLengthWeeks] = useState(existing?.lengthWeeks ?? 4);
  const [days, setDays] = useState<DayForm[]>(
    existing ? daysFromProgram(existing) : [newDay(1, 1)],
  );
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  function updateDay(di: number, patch: Partial<DayForm>) {
    setDays((ds) => ds.map((d, idx) => (idx === di ? { ...d, ...patch } : d)));
  }

  function updateLine(di: number, li: number, patch: Partial<Line>) {
    setDays((ds) =>
      ds.map((d, idx) =>
        idx === di
          ? { ...d, lines: d.lines.map((l, j) => (j === li ? { ...l, ...patch } : l)) }
          : d,
      ),
    );
  }

  function addDay() {
    const last = days[days.length - 1];
    setDays((ds) => [...ds, newDay(last?.weekNumber ?? 1, (last?.dayNumber ?? 0) + 1)]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const dayPayloads = days
      .map((d) => ({
        weekNumber: d.weekNumber,
        dayNumber: d.dayNumber,
        name: d.name,
        exercises: d.lines
          .filter((l) => l.exerciseId)
          .map((l, idx) => ({
            exerciseId: l.exerciseId,
            orderIndex: idx + 1,
            targetSets: Number(l.targetSets),
            targetReps: Number(l.targetReps),
            targetRpe: l.targetRpe ? Number(l.targetRpe) : undefined,
            targetPercent1rm: l.targetPercent1rm ? Number(l.targetPercent1rm) : undefined,
            targetWeight: l.targetWeight ? Number(l.targetWeight) : undefined,
            notes: l.notes || undefined,
          })),
      }))
      .filter((d) => d.exercises.length > 0);

    if (!name || dayPayloads.length === 0) {
      setError('Give the program a name and at least one day with an exercise.');
      return;
    }
    setBusy(true);
    try {
      const payload = { ownerId, name, discipline, lengthWeeks, days: dayPayloads };
      if (existing) {
        await api.updateProgram(existing.id, payload);
        onCancel?.();
      } else {
        await api.createProgram(payload);
        setName('');
        setDays([newDay(1, 1)]);
      }
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
          <label>Length (weeks)</label>
          <input
            type="number"
            min={1}
            max={52}
            value={lengthWeeks}
            onChange={(e) => setLengthWeeks(Number(e.target.value))}
            style={{ width: 80 }}
          />
        </div>
      </div>

      {days.map((day, di) => (
        <div
          key={di}
          className="panel"
          style={{ background: 'var(--panel-2)', marginTop: '1rem', marginBottom: 0 }}
        >
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div style={{ maxWidth: 80 }}>
              <label>Week</label>
              <input
                type="number"
                min={1}
                value={day.weekNumber}
                onChange={(e) => updateDay(di, { weekNumber: Number(e.target.value) })}
              />
            </div>
            <div style={{ maxWidth: 80 }}>
              <label>Day #</label>
              <input
                type="number"
                min={1}
                value={day.dayNumber}
                onChange={(e) => updateDay(di, { dayNumber: Number(e.target.value) })}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label>Day label</label>
              <input
                value={day.name}
                onChange={(e) => updateDay(di, { name: e.target.value })}
              />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <button
                type="button"
                className="ghost small"
                onClick={() => setDays((ds) => ds.filter((_, idx) => idx !== di))}
                disabled={days.length === 1}
              >
                Remove day
              </button>
            </div>
          </div>

          <div className="table-scroll" style={{ marginTop: '.5rem' }}>
          <table>
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Sets</th>
                <th>Reps</th>
                <th>RPE</th>
                <th>% 1RM</th>
                <th>Weight (kg)</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {day.lines.map((l, li) => (
                <tr key={li}>
                  <td>
                    <select
                      value={l.exerciseId}
                      onChange={(e) => updateLine(di, li, { exerciseId: e.target.value })}
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
                        updateLine(di, li, { targetSets: Number(e.target.value) })
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
                        updateLine(di, li, { targetReps: Number(e.target.value) })
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
                      onChange={(e) => updateLine(di, li, { targetRpe: e.target.value })}
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
                        updateLine(di, li, { targetPercent1rm: e.target.value })
                      }
                      style={{ width: 64 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={l.targetWeight}
                      onChange={(e) => updateLine(di, li, { targetWeight: e.target.value })}
                      placeholder="optional"
                      style={{ width: 72 }}
                    />
                  </td>
                  <td>
                    <input
                      value={l.notes}
                      onChange={(e) => updateLine(di, li, { notes: e.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() =>
                        updateDay(di, {
                          lines: day.lines.filter((_, idx) => idx !== li),
                        })
                      }
                      disabled={day.lines.length === 1}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <button
            type="button"
            className="ghost small"
            style={{ marginTop: '.5rem' }}
            onClick={() => updateDay(di, { lines: [...day.lines, { ...emptyLine }] })}
          >
            + Add exercise
          </button>
        </div>
      ))}

      <div className="row" style={{ marginTop: '1rem' }}>
        <button type="button" className="ghost" onClick={addDay}>
          + Add day
        </button>
        {existing && (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button disabled={busy}>{existing ? 'Save changes' : 'Create program'}</button>
      </div>
    </form>
  );
}
