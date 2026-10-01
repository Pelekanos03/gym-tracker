import { useMemo, useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import type { Exercise, ExerciseCategory } from '../types';

/**
 * Your exercise library: the built-in movements everyone shares, plus the
 * ones you've added. What you add is yours alone — friends don't see it in
 * their library. (Other tabs pick up a newly added exercise next time
 * they're opened — each fetches its own copy.)
 */
export function ExerciseLibrary({ userId }: { userId: string }) {
  const exercises = useAsync(() => api.listExercises(userId), [userId]);
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
        <MergeExercisesTool
          userId={userId}
          exercises={exercises.data ?? []}
          onMerged={exercises.reload}
        />
      )}

      {open && (
        <AddExerciseForm
          userId={userId}
          muscles={Object.keys(byMuscle)}
          onCreated={() => {
            setOpen(false);
            exercises.reload();
          }}
        />
      )}

      <YourExercises
        exercises={(exercises.data ?? []).filter((ex) => ex.ownerId === userId)}
        onDeleted={exercises.reload}
      />

      {Object.entries(byMuscle).map(([muscle, list]) => (
        <div key={muscle} style={{ marginTop: '.75rem' }}>
          <h3 style={{ marginBottom: '.3rem' }}>{muscle}</h3>
          <div className="row" style={{ gap: '.4rem' }}>
            {list.map((ex) => (
              <span
                key={ex.id}
                className="tag"
                title={ex.ownerId === userId ? 'Added by you — only you see it' : undefined}
              >
                {ex.name}
                {ex.isCompetitionLift && <span className="muted"> · comp</span>}
                {ex.ownerId === userId && <span className="muted"> · yours</span>}
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
  userId,
  exercises,
  onMerged,
}: {
  userId: string;
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

  // Only your own additions can be merged away (deleted); built-in and
  // friends' exercises can still be the one you keep.
  const mine = useMemo(() => exercises.filter((ex) => ex.ownerId === userId), [exercises, userId]);
  const possibleDuplicates = useMemo(
    () =>
      findPossibleDuplicates(exercises).filter(
        ([a, b]) => a.ownerId === userId || b.ownerId === userId,
      ),
    [exercises, userId],
  );
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
      setPreview(await api.mergeExercisesPreview(keepId, mergeId, userId));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirmMerge() {
    setBusy(true);
    setError(undefined);
    try {
      const kept = await api.mergeExercises(keepId, mergeId, userId);
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
        If you added a movement that's already in the library under a different name (e.g.
        "Bench" vs "Bench Press"), merge your copy into it. Every program line and logged set
        on the duplicate moves to the one you keep, then the duplicate is deleted — this can't
        be undone. You can only merge away exercises you added yourself.
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
            {mine.map((ex) => (
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

function AddExerciseForm({
  userId,
  muscles,
  onCreated,
}: {
  userId: string;
  /** Existing body parts, offered as suggestions — any new one can still be typed. */
  muscles: string[];
  onCreated: () => void;
}) {
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
      await api.createExercise({ ownerId: userId, name, category, primaryMuscle, isCompetitionLift });
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
            placeholder="e.g. Chest, or something specific"
            list="body-part-suggestions"
          />
          <datalist id="body-part-suggestions">
            {muscles.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
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

/** The exercises you added, each deletable after a confirmation that says what goes with it. */
function YourExercises({ exercises, onDeleted }: { exercises: Exercise[]; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState<string>();
  if (exercises.length === 0) return null;
  return (
    <div className="your-exercises">
      <h3>Added by you</h3>
      {[...exercises]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((ex) =>
          confirming === ex.id ? (
            <ConfirmDeleteExercise
              key={ex.id}
              exercise={ex}
              onCancel={() => setConfirming(undefined)}
              onDeleted={() => {
                setConfirming(undefined);
                onDeleted();
              }}
            />
          ) : (
            <div key={ex.id} className="your-exercise-row">
              <span>
                {ex.name} <span className="muted">· {ex.primaryMuscle}</span>
              </span>
              <button type="button" className="ghost small" onClick={() => setConfirming(ex.id)}>
                Delete
              </button>
            </div>
          ),
        )}
    </div>
  );
}

function ConfirmDeleteExercise({
  exercise,
  onCancel,
  onDeleted,
}: {
  exercise: Exercise;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const preview = useAsync(() => api.deleteExercisePreview(exercise.id), [exercise.id]);
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const p = preview.data;
  const losesData = !!p && (p.setLogCount > 0 || p.programExerciseCount > 0);

  async function confirmDelete() {
    setBusy(true);
    setError(undefined);
    try {
      await api.deleteExercise(exercise.id);
      onDeleted();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="panel confirm-delete">
      <strong>Delete "{exercise.name}"?</strong>
      {(preview.error || error) && <div className="err">{preview.error ?? error}</div>}
      {!p && !preview.error && <p className="muted">Checking what uses it…</p>}
      {p && (
        <>
          {losesData ? (
            <p>
              This also deletes <strong>{p.setLogCount}</strong> logged set(s) and{' '}
              <strong>{p.programExerciseCount}</strong> program line(s) of yours that use it. This
              can't be undone.
            </p>
          ) : (
            <p className="muted">Nothing of yours uses it — it just leaves your library.</p>
          )}
          {p.usedByOthers && (
            <p className="muted">
              A friend or client still uses it, so their copy of it stays — it only disappears
              for you.
            </p>
          )}
          {losesData && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
              />
              <span>I understand those sets and program lines will be deleted.</span>
            </label>
          )}
        </>
      )}
      <div className="row" style={{ justifyContent: 'flex-start' }}>
        <button
          type="button"
          className="danger"
          disabled={!p || busy || (losesData && !understood)}
          onClick={confirmDelete}
          style={{ flex: '0 0 auto' }}
        >
          {busy ? 'Deleting…' : 'Delete exercise'}
        </button>
        <button type="button" className="ghost" onClick={onCancel} style={{ flex: '0 0 auto' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
