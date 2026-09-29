import { useMemo, useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import type { Exercise, ExerciseCategory } from '../types';

/**
 * The shared exercise library everyone builds programs and logs sets from.
 * Anyone can add a movement that's missing — it's immediately available to
 * every user, the same as the seeded exercises. (Other tabs pick up a newly
 * added exercise next time they're opened — each fetches its own copy.)
 */
export function ExerciseLibrary() {
  const exercises = useAsync(() => api.listExercises(), []);
  const [open, setOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const byMuscle = groupByMuscle(exercises.data ?? []);

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Exercise library</h2>
        <div className="row" style={{ flex: '0 0 auto' }}>
          <button className="ghost small" onClick={() => setMergeOpen((o) => !o)}>
            {mergeOpen ? 'Close' : 'Merge duplicates'}
          </button>
          <button className="ghost small" onClick={() => setOpen((o) => !o)}>
            {open ? 'Close' : '+ Add exercise'}
          </button>
        </div>
      </div>

      {exercises.error && <div className="err">{exercises.error}</div>}

      {mergeOpen && (
        <MergeExercisesTool exercises={exercises.data ?? []} onMerged={exercises.reload} />
      )}

      {open && (
        <AddExerciseForm
          onCreated={() => {
            setOpen(false);
            exercises.reload();
          }}
        />
      )}

      {Object.entries(byMuscle).map(([muscle, list]) => (
        <div key={muscle} style={{ marginTop: '.75rem' }}>
          <h3 style={{ marginBottom: '.3rem' }}>{muscle}</h3>
          <div className="row" style={{ gap: '.4rem' }}>
            {list.map((ex) => (
              <span key={ex.id} className="tag">
                {ex.name}
                {ex.isCompetitionLift && ' 🏆'}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Loose match so "Bench" and "Bench Press" surface as a hint — not used to act automatically, just to help you spot pairs worth merging. */
function looksLikeSameExercise(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const nb = b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!na || !nb) return false;
  return na === nb || na.startsWith(nb + ' ') || nb.startsWith(na + ' ');
}

function findPossibleDuplicates(exercises: Exercise[]): [Exercise, Exercise][] {
  const pairs: [Exercise, Exercise][] = [];
  for (let i = 0; i < exercises.length; i++) {
    for (let j = i + 1; j < exercises.length; j++) {
      if (looksLikeSameExercise(exercises[i].name, exercises[j].name)) {
        pairs.push([exercises[i], exercises[j]]);
      }
    }
  }
  return pairs;
}

/**
 * Merging is irreversible (every program line and logged set on the
 * duplicate is repointed, then it's deleted), so this always shows a
 * preview of what will move and requires an explicit confirmation checkbox
 * before the "Merge now" button is even clickable.
 */
function MergeExercisesTool({
  exercises,
  onMerged,
}: {
  exercises: Exercise[];
  onMerged: () => void;
}) {
  const [keepId, setKeepId] = useState('');
  const [mergeId, setMergeId] = useState('');
  const [preview, setPreview] = useState<{ programExerciseCount: number; setLogCount: number }>();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const [busy, setBusy] = useState(false);

  const possibleDuplicates = useMemo(() => findPossibleDuplicates(exercises), [exercises]);
  const keepEx = exercises.find((ex) => ex.id === keepId);
  const mergeEx = exercises.find((ex) => ex.id === mergeId);

  function reset() {
    setPreview(undefined);
    setConfirmed(false);
    setError(undefined);
  }

  async function loadPreview() {
    reset();
    if (!keepId || !mergeId) return;
    if (keepId === mergeId) {
      setError('Pick two different exercises.');
      return;
    }
    try {
      setPreview(await api.mergeExercisesPreview(keepId, mergeId));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirmMerge() {
    setBusy(true);
    setError(undefined);
    try {
      const kept = await api.mergeExercises(keepId, mergeId);
      setDone(kept.name);
      setKeepId('');
      setMergeId('');
      reset();
      onMerged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ background: 'var(--panel-2)', marginTop: '.75rem' }}>
      <h3>Merge duplicate exercises</h3>
      <p className="muted" style={{ fontSize: '.85em' }}>
        If a friend logs the same movement under a different name (e.g. "Bench" vs "Bench
        Press"), merge them into one entry. Every program line and logged set on the duplicate
        moves to the one you keep, then the duplicate is deleted — this can't be undone.
      </p>

      {possibleDuplicates.length > 0 && (
        <p className="muted" style={{ fontSize: '.85em' }}>
          Possible duplicates:{' '}
          {possibleDuplicates.map(([a, b], i) => (
            <span key={a.id + b.id}>
              {i > 0 && ', '}"{a.name}" / "{b.name}"
            </span>
          ))}
        </p>
      )}

      {error && <div className="err">{error}</div>}
      {done && <p className="pr">Merged — kept "{done}".</p>}

      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div>
          <label>Keep this one</label>
          <select
            value={keepId}
            onChange={(e) => {
              setKeepId(e.target.value);
              reset();
            }}
          >
            <option value="">— pick —</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Merge this one into it (deleted after)</label>
          <select
            value={mergeId}
            onChange={(e) => {
              setMergeId(e.target.value);
              reset();
            }}
          >
            <option value="">— pick —</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <button type="button" onClick={loadPreview} disabled={!keepId || !mergeId}>
            Preview merge
          </button>
        </div>
      </div>

      {preview && keepEx && mergeEx && (
        <div className="panel" style={{ marginTop: '.75rem', background: 'var(--panel)' }}>
          <p>
            This will move <strong>{preview.programExerciseCount}</strong> program line(s) and{' '}
            <strong>{preview.setLogCount}</strong> logged set(s) from "{mergeEx.name}" onto "
            {keepEx.name}", then permanently delete "{mergeEx.name}".
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I'm sure "{mergeEx.name}" and "{keepEx.name}" are the same exercise.
          </label>
          <button
            type="button"
            style={{ marginTop: '.5rem' }}
            disabled={!confirmed || busy}
            onClick={confirmMerge}
          >
            Merge now
          </button>
        </div>
      )}
    </div>
  );
}

function groupByMuscle(exercises: Exercise[]): Record<string, Exercise[]> {
  const groups: Record<string, Exercise[]> = {};
  for (const ex of [...exercises].sort((a, b) => a.name.localeCompare(b.name))) {
    (groups[ex.primaryMuscle] ??= []).push(ex);
  }
  return groups;
}

function AddExerciseForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('COMPOUND');
  const [primaryMuscle, setPrimaryMuscle] = useState('');
  const [isCompetitionLift, setIsCompetitionLift] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!name || !primaryMuscle) {
      setError('Give it a name and a primary muscle group.');
      return;
    }
    setBusy(true);
    try {
      await api.createExercise({ name, category, primaryMuscle, isCompetitionLift });
      setName('');
      setPrimaryMuscle('');
      setIsCompetitionLift(false);
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: '.75rem' }}>
      {error && <div className="err">{error}</div>}
      <div className="row">
        <div>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>Primary muscle</label>
          <input
            value={primaryMuscle}
            onChange={(e) => setPrimaryMuscle(e.target.value)}
            placeholder="e.g. Chest"
          />
        </div>
        <div>
          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
          >
            <option value="COMPOUND">Compound</option>
            <option value="ISOLATION">Isolation</option>
          </select>
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <label>
            <input
              type="checkbox"
              checked={isCompetitionLift}
              onChange={(e) => setIsCompetitionLift(e.target.checked)}
              style={{ marginRight: '.3rem' }}
            />
            Competition lift
          </label>
        </div>
      </div>
      <button disabled={busy} style={{ marginTop: '.5rem' }}>
        Add exercise
      </button>
    </form>
  );
}
