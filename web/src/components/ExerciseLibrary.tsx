import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import type { Exercise, ExerciseCategory } from '../types';
import { ExercisePicker } from './ExercisePicker';

/**
 * Your exercise library: the built-in movements plus the ones you added.
 * Tap any exercise for what you can do with it — delete or merge your own,
 * or take a built-in out of your library (built-ins are shared, so they're
 * hidden for you rather than deleted for everyone).
 */
export function ExerciseLibrary({ userId }: { userId: string }) {
  const exercises = useAsync(() => api.listExercises(userId), [userId]);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Exercise>();
  const [showHidden, setShowHidden] = useState(false);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string>();
  const all = exercises.data ?? [];
  const visible = all.filter((ex) => !ex.hidden);
  const hidden = all.filter((ex) => ex.hidden);
  const allMuscles = Object.keys(groupByMuscle(visible));
  // Same search + body-part filter as the exercise picker.
  const q = query.trim().toLowerCase();
  const shown = visible.filter(
    (ex) =>
      (!muscle || ex.primaryMuscle === muscle) &&
      (!q || ex.name.toLowerCase().includes(q) || ex.primaryMuscle.toLowerCase().includes(q)),
  );
  const byMuscle = groupByMuscle(shown);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Exercise library</h2>
        <button className="ghost small" onClick={() => setAdding((o) => !o)}>
          {adding ? 'Close' : '+ Add exercise'}
        </button>
      </div>
      <p className="muted library-hint">Tap an exercise to delete, merge or hide it.</p>

      <input
        type="search"
        className="library-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises…"
        aria-label="Search exercises"
      />
      <div className="chips scroll-x library-chips">
        <button type="button" className={`chip${muscle ? '' : ' active'}`} onClick={() => setMuscle(undefined)}>
          All
        </button>
        {allMuscles.map((m) => (
          <button
            key={m}
            type="button"
            className={`chip${muscle === m ? ' active' : ''}`}
            onClick={() => setMuscle(muscle === m ? undefined : m)}
          >
            {m}
          </button>
        ))}
      </div>
      {shown.length === 0 && visible.length > 0 && (
        <p className="muted">No exercise matches — try another word, or add it with "+ Add exercise".</p>
      )}

      {exercises.error && <div className="err">{exercises.error}</div>}

      {adding && (
        <AddExerciseForm
          userId={userId}
          muscles={allMuscles}
          onCreated={() => {
            setAdding(false);
            exercises.reload();
          }}
        />
      )}

      {Object.entries(byMuscle).map(([muscle, list]) => (
        <div key={muscle} className="library-group">
          <h3>{muscle}</h3>
          <div className="library-list">
            {list.map((ex) => (
              <button key={ex.id} type="button" className="library-item" onClick={() => setSelected(ex)}>
                <span>{ex.name}</span>
                <span className="library-tags">
                  {ex.isCompetitionLift && <span className="muted">comp</span>}
                  {ex.ownerId === userId && <span className="tag">yours</span>}
                  <span className="muted" aria-hidden>
                    ›
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {hidden.length > 0 && (
        <div className="library-group">
          <button type="button" className="link-button" style={{ margin: '.75rem 0 0' }} onClick={() => setShowHidden((s) => !s)}>
            {showHidden ? 'Hide' : 'Show'} {hidden.length} exercise{hidden.length === 1 ? '' : 's'} you removed
          </button>
          {showHidden && (
            <div className="library-list">
              {hidden.map((ex) => (
                <div key={ex.id} className="library-item static">
                  <span className="muted">{ex.name}</span>
                  <button
                    type="button"
                    className="ghost small"
                    onClick={async () => {
                      await api.unhideExercise(ex.id);
                      exercises.reload();
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <ExerciseActions
          exercise={selected}
          userId={userId}
          exercises={visible}
          onClose={() => setSelected(undefined)}
          onChanged={() => {
            setSelected(undefined);
            exercises.reload();
          }}
        />
      )}
    </div>
  );
}

type Step = 'menu' | 'delete' | 'merge' | 'hide';

/** The options for one exercise, in a sheet (bottom sheet on a phone). */
function ExerciseActions({
  exercise,
  userId,
  exercises,
  onClose,
  onChanged,
}: {
  exercise: Exercise;
  userId: string;
  exercises: Exercise[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const mine = exercise.ownerId === userId;
  const [step, setStep] = useState<Step>('menu');
  const [error, setError] = useState<string>();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function hide() {
    setError(undefined);
    try {
      await api.hideExercise(exercise.id);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet action-sheet" role="dialog" aria-label={exercise.name} onClick={(e) => e.stopPropagation()}>
        <div className="action-sheet-head">
          <div>
            <strong>{exercise.name}</strong>
            <div className="muted" style={{ fontSize: '.8rem' }}>
              {exercise.primaryMuscle} · {exercise.category === 'COMPOUND' ? 'Compound' : 'Isolation'} ·{' '}
              {mine ? 'added by you' : 'built-in'}
            </div>
          </div>
          <button type="button" className="ghost small" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {error && <div className="err">{error}</div>}

        {step === 'menu' && (
          <div className="action-list">
            {mine ? (
              <>
                <button type="button" className="action-item" onClick={() => setStep('merge')}>
                  Merge into another exercise…
                  <span className="muted">Same movement under another name? Move its sets there.</span>
                </button>
                <button type="button" className="action-item danger-text" onClick={() => setStep('delete')}>
                  Delete exercise…
                  <span className="muted">Removes it, and asks before deleting any sets that use it.</span>
                </button>
              </>
            ) : (
              <button type="button" className="action-item danger-text" onClick={() => setStep('hide')}>
                Remove from my library…
                <span className="muted">
                  It's a built-in shared by everyone, so it's only hidden for you. Your past sets keep it.
                </span>
              </button>
            )}
          </div>
        )}

        {step === 'hide' && (
          <div className="action-step">
            <p>
              Hide <strong>{exercise.name}</strong> from your library and exercise pickers? Your past
              workouts and programs that use it stay as they are, and you can restore it any time from
              the bottom of the library.
            </p>
            <div className="row stack-on-phone">
              <button type="button" className="danger" onClick={hide}>
                Remove from my library
              </button>
              <button type="button" className="ghost" onClick={() => setStep('menu')}>
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'delete' && (
          <div className="action-step">
            <ConfirmDeleteExercise exercise={exercise} onCancel={() => setStep('menu')} onDeleted={onChanged} />
          </div>
        )}

        {step === 'merge' && (
          <div className="action-step">
            <MergeInto exercise={exercise} userId={userId} exercises={exercises} onBack={() => setStep('menu')} onMerged={onChanged} />
          </div>
        )}

        <button type="button" className="ghost action-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * Folds one of your exercises into another (built-in or yours): every
 * set and program line moves across, then yours is deleted. Shows exactly
 * what will move and needs a tick before it runs — it can't be undone.
 */
function MergeInto({
  exercise,
  userId,
  exercises,
  onBack,
  onMerged,
}: {
  exercise: Exercise;
  userId: string;
  exercises: Exercise[];
  onBack: () => void;
  onMerged: () => void;
}) {
  const [keepId, setKeepId] = useState('');
  const [preview, setPreview] = useState<{ programExerciseCount: number; setLogCount: number }>();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const keep = exercises.find((ex) => ex.id === keepId);

  async function pick(id: string) {
    setKeepId(id);
    setPreview(undefined);
    setConfirmed(false);
    setError(undefined);
    try {
      setPreview(await api.mergeExercisesPreview(id, exercise.id, userId));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function merge() {
    setBusy(true);
    setError(undefined);
    try {
      await api.mergeExercises(keepId, exercise.id, userId);
      onMerged();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <label>Merge "{exercise.name}" into</label>
      <ExercisePicker
        exercises={exercises.filter((ex) => ex.id !== exercise.id)}
        value={keepId}
        onChange={pick}
        placeholder="Pick the exercise to keep"
      />
      {error && <div className="err" style={{ marginTop: '.5rem' }}>{error}</div>}
      {preview && keep && (
        <>
          <p>
            <strong>{preview.setLogCount}</strong> logged set(s) and{' '}
            <strong>{preview.programExerciseCount}</strong> program line(s) move from "{exercise.name}" to "
            {keep.name}", then "{exercise.name}" is deleted. This can't be undone.
          </p>
          <label className="checkbox-row">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>
              "{exercise.name}" and "{keep.name}" are the same exercise.
            </span>
          </label>
        </>
      )}
      <div className="row stack-on-phone" style={{ marginTop: '.5rem' }}>
        <button type="button" disabled={!preview || !confirmed || busy} onClick={merge}>
          {busy ? 'Merging…' : 'Merge'}
        </button>
        <button type="button" className="ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </>
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
