import { Fragment, useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import { ExercisePicker } from './ExercisePicker';
import type { Exercise, Program, SetType } from '../types';
import { SET_TYPE_LABELS } from '../types';

const SET_TYPES: SetType[] = ['WORKING', 'WARMUP', 'DROP_SET', 'SUPERSET', 'BACKOFF', 'AMRAP'];

interface Line {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetRpe: string;
  targetWeight: string;
  setType: SetType;
  notes: string;
}

const emptyLine: Line = {
  exerciseId: '',
  targetSets: 3,
  targetReps: 5,
  targetRpe: '',
  targetWeight: '',
  setType: 'WORKING',
  notes: '',
};

/** One back-off row in the helper: example values the user can edit, and untick to leave out. */
interface BackoffRow {
  weight: string;
  reps: string;
  use: boolean;
}

/** What the "Top set + back-offs" helper asks for. Strings while being typed. */
interface BackoffPlan {
  topWeight: string;
  topReps: string;
  dropPerSet: string;
  rows: BackoffRow[];
}

/** Top set / back-off planning is for the big multi-joint lifts, not isolation accessories. */
function isCompound(exercise: Exercise | undefined): boolean {
  return exercise?.category === 'COMPOUND';
}

/** Example weight for the nth back-off (1-based): each drops by the same amount again, never below 0. */
function exampleBackoffWeight(topWeight: string, dropPerSet: string, n: number): string {
  if (!topWeight) return '';
  return String(Math.max(0, Number(topWeight) - Number(dropPerSet || 0) * n));
}

/** Re-fills every row's example weight from the top set and the drop, keeping reps and ticks. */
function withExampleWeights(plan: BackoffPlan): BackoffPlan {
  return {
    ...plan,
    rows: plan.rows.map((r, i) => ({
      ...r,
      weight: exampleBackoffWeight(plan.topWeight, plan.dropPerSet, i + 1),
    })),
  };
}

/**
 * Turns one line into a top set followed by lighter back-off sets, one line
 * each, so every set can still be tweaked by hand afterwards.
 */
function linesFromBackoffPlan(base: Line, plan: BackoffPlan): Line[] {
  const top: Line = {
    ...base,
    targetSets: 1,
    targetReps: Number(plan.topReps),
    targetWeight: plan.topWeight,
    setType: 'WORKING',
    notes: base.notes || 'Top set',
  };
  const backoffs = plan.rows
    .filter((r) => r.use && r.reps)
    .map(
      (r): Line => ({
        ...emptyLine,
        exerciseId: base.exerciseId,
        targetSets: 1,
        targetReps: Number(r.reps),
        targetWeight: r.weight,
        setType: 'BACKOFF',
      }),
    );
  return [top, ...backoffs];
}

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
        targetWeight: pe.targetWeight != null ? String(pe.targetWeight) : '',
        setType: pe.setType ?? 'WORKING',
        notes: pe.notes,
      })),
  }));
}

/**
 * Multi-week, multi-day program builder: add as many training days as the
 * plan needs, each with its own prescribed exercises (sets/reps/RPE/weight).
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
  const exercises = useAsync(() => api.listExercises(ownerId), [ownerId]);
  const [name, setName] = useState(existing?.name ?? '');
  const [lengthWeeks, setLengthWeeks] = useState(existing?.lengthWeeks ?? 4);
  const [days, setDays] = useState<DayForm[]>(
    existing ? daysFromProgram(existing) : [newDay(1, 1)],
  );
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  /** The line the "Top set + back-offs" helper is open on, if any — one at a time. */
  const [planning, setPlanning] = useState<{ di: number; li: number; plan: BackoffPlan }>();

  function openBackoffPlanner(di: number, li: number) {
    const line = days[di].lines[li];
    const reps = String(line.targetReps);
    const plan: BackoffPlan = {
      topWeight: line.targetWeight,
      topReps: reps,
      dropPerSet: '10',
      rows: [1, 2, 3].map(() => ({ weight: '', reps, use: true })),
    };
    setPlanning({ di, li, plan: withExampleWeights(plan) });
  }

  function applyBackoffPlan() {
    if (!planning) return;
    const { di, li, plan } = planning;
    if (!plan.topWeight || !plan.topReps) {
      setError('Give the top set a weight and reps.');
      return;
    }
    setError(undefined);
    const day = days[di];
    const generated = linesFromBackoffPlan(day.lines[li], plan);
    updateDay(di, { lines: [...day.lines.slice(0, li), ...generated, ...day.lines.slice(li + 1)] });
    setPlanning(undefined);
  }

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

  const lastWeek = Math.max(...days.map((d) => d.weekNumber));

  /**
   * Copies every day of the latest week into the next week — same days,
   * exercises, sets, reps and weights — so a multi-week program only has
   * to be typed once and then tweaked week by week.
   */
  function duplicateLastWeek() {
    const nextWeek = lastWeek + 1;
    const copies = days
      .filter((d) => d.weekNumber === lastWeek)
      .map((d) => ({ ...d, weekNumber: nextWeek, lines: d.lines.map((l) => ({ ...l })) }));
    setDays((ds) => [...ds, ...copies]);
    setLengthWeeks((w) => Math.max(w, nextWeek));
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
            targetWeight: l.targetWeight ? Number(l.targetWeight) : undefined,
            setType: l.setType,
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
      const payload = { ownerId, name, lengthWeeks, days: dayPayloads };
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
        <Fragment key={di}>
        {/* A labelled line wherever a new week starts, so weeks don't blur together. */}
        {(di === 0 || days[di - 1].weekNumber !== day.weekNumber) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.6rem',
              marginTop: di === 0 ? '1rem' : '1.75rem',
            }}
          >
            <strong style={{ whiteSpace: 'nowrap', color: 'var(--accent)' }}>
              Week {day.weekNumber}
            </strong>
            <div style={{ flex: 1, borderTop: '2px solid var(--accent)' }} />
          </div>
        )}
        <div
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
                <th>Weight (kg)</th>
                <th>Set type</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {day.lines.map((l, li) => (
                <Fragment key={li}>
                <tr>
                  <td>
                    <ExercisePicker
                      exercises={exercises.data ?? []}
                      value={l.exerciseId}
                      onChange={(id) => updateLine(di, li, { exerciseId: id })}
                      style={{ minWidth: 160 }}
                    />
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
                      min={0}
                      step={0.5}
                      value={l.targetWeight}
                      onChange={(e) => updateLine(di, li, { targetWeight: e.target.value })}
                      placeholder="optional"
                      style={{ width: 72 }}
                    />
                  </td>
                  <td>
                    <select
                      value={l.setType}
                      onChange={(e) => updateLine(di, li, { setType: e.target.value as SetType })}
                      style={{ minWidth: 100 }}
                    >
                      {SET_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {SET_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={l.notes}
                      onChange={(e) => updateLine(di, li, { notes: e.target.value })}
                    />
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {l.setType !== 'BACKOFF' &&
                      isCompound(exercises.data?.find((ex) => ex.id === l.exerciseId)) && (
                        <>
                          <button
                            type="button"
                            className="ghost small"
                            title="Turn this line into a top set followed by lighter back-off sets"
                            onClick={() => openBackoffPlanner(di, li)}
                          >
                            Top set + back-offs
                          </button>{' '}
                        </>
                      )}
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => {
                        setPlanning(undefined);
                        updateDay(di, {
                          lines: day.lines.filter((_, idx) => idx !== li),
                        });
                      }}
                      disabled={day.lines.length === 1}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                {planning?.di === di && planning.li === li && (
                  <tr>
                    <td colSpan={8}>
                      <BackoffPlanner
                        plan={planning.plan}
                        onChange={(plan) => setPlanning({ ...planning, plan })}
                        onApply={applyBackoffPlan}
                        onCancel={() => setPlanning(undefined)}
                      />
                    </td>
                  </tr>
                )}
                </Fragment>
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
        </Fragment>
      ))}

      <div className="row" style={{ marginTop: '1rem' }}>
        <button type="button" className="ghost" onClick={addDay}>
          + Add day
        </button>
        <button
          type="button"
          className="ghost"
          title={`Copy all of week ${lastWeek}'s days into week ${lastWeek + 1}`}
          onClick={duplicateLastWeek}
        >
          Duplicate week {lastWeek} → week {lastWeek + 1}
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


/**
 * Inline form for the "Top set + back-offs" helper: the top set, then
 * back-off rows pre-filled with example weights (dropping by the same
 * amount each set). Edit any row, untick the ones you don't want, add
 * more, then apply.
 */
function BackoffPlanner({
  plan,
  onChange,
  onApply,
  onCancel,
}: {
  plan: BackoffPlan;
  onChange: (plan: BackoffPlan) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  // Changing the top set or the drop re-fills the example weights below.
  function changeTop(patch: Partial<Pick<BackoffPlan, 'topWeight' | 'dropPerSet'>>) {
    onChange(withExampleWeights({ ...plan, ...patch }));
  }

  function updateRow(i: number, patch: Partial<BackoffRow>) {
    onChange({ ...plan, rows: plan.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }

  function addRow() {
    const n = plan.rows.length + 1;
    const reps = plan.rows[plan.rows.length - 1]?.reps ?? plan.topReps;
    onChange({
      ...plan,
      rows: [
        ...plan.rows,
        { weight: exampleBackoffWeight(plan.topWeight, plan.dropPerSet, n), reps, use: true },
      ],
    });
  }

  const chosen = plan.rows.filter((r) => r.use && r.reps).length;
  const fixed = { flex: '0 0 auto', minWidth: 0 } as const;

  return (
    <div className="panel" style={{ margin: '.25rem 0', padding: '.75rem' }}>
      <div className="row">
        <div style={{ maxWidth: 130 }}>
          <label>Top set (kg)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={plan.topWeight}
            onChange={(e) => changeTop({ topWeight: e.target.value })}
          />
        </div>
        <div style={{ maxWidth: 130 }}>
          <label>Top set reps</label>
          <input
            type="number"
            min={1}
            value={plan.topReps}
            onChange={(e) => onChange({ ...plan, topReps: e.target.value })}
          />
        </div>
        <div style={{ maxWidth: 130 }}>
          <label>Drop each set (kg)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={plan.dropPerSet}
            onChange={(e) => changeTop({ dropPerSet: e.target.value })}
          />
        </div>
      </div>

      <label style={{ marginTop: '.6rem' }}>Back-off sets</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
        {plan.rows.map((r, i) => (
          <div
            key={i}
            className="row"
            style={{ alignItems: 'center', gap: '.4rem', opacity: r.use ? 1 : 0.5 }}
          >
            <input
              type="checkbox"
              checked={r.use}
              onChange={(e) => updateRow(i, { use: e.target.checked })}
              title={r.use ? 'Included — untick to leave this set out' : 'Left out — tick to include'}
              style={{ ...fixed, width: 'auto' }}
            />
            <span className="muted" style={{ ...fixed, whiteSpace: 'nowrap' }}>
              Back-off {i + 1}
            </span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={r.weight}
              onChange={(e) => updateRow(i, { weight: e.target.value })}
              placeholder="kg"
              style={{ ...fixed, width: 80 }}
            />
            <span className="muted" style={fixed}>
              kg ×
            </span>
            <input
              type="number"
              min={1}
              value={r.reps}
              onChange={(e) => updateRow(i, { reps: e.target.value })}
              placeholder="reps"
              style={{ ...fixed, width: 64 }}
            />
            <button
              type="button"
              className="ghost small"
              title="Remove this row"
              onClick={() => onChange({ ...plan, rows: plan.rows.filter((_, j) => j !== i) })}
              style={fixed}
            >
              ✕
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="ghost small" onClick={addRow}>
            + Add back-off set
          </button>
        </div>
      </div>

      <div className="row" style={{ marginTop: '.75rem' }}>
        <div style={fixed}>
          <button type="button" className="small" onClick={onApply}>
            Apply (top set + {chosen} back-off{chosen === 1 ? '' : 's'})
          </button>
        </div>
        <div style={fixed}>
          <button type="button" className="ghost small" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
