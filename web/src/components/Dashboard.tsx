import { Fragment, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import type {
  BlockDay,
  Program,
  ProgramDay,
  SetType,
  TrainingBlock,
  User,
  WorkoutSession,
} from '../types';
import { SET_TYPE_LABELS } from '../types';
import { ProgramBuilder } from './ProgramBuilder';
import { FriendsPanel } from './FriendsPanel';
import { HistoryPanel } from './HistoryPanel';
import { StatsPanel } from './StatsPanel';
import { PendingVideoButton, UploadProgress } from './SetVideo';
import { ExerciseLibrary } from './ExerciseLibrary';
import { BlockPicker } from './BlockPicker';
import { ExercisePicker } from './ExercisePicker';
import {
  DropRows,
  SupersetRows,
  dropsPayload,
  emptyDrop,
  emptyPartner,
  partnersPayload,
  type DropEntry,
  type PartnerEntry,
} from './SetExtras';

type Tab = 'log' | 'history' | 'stats' | 'programs' | 'friends';

const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: 'Workout' },
  { id: 'history', label: 'History' },
  { id: 'stats', label: 'Stats' },
  { id: 'programs', label: 'Programs' },
  { id: 'friends', label: 'Friends' },
];

/**
 * What a user does here:
 *  1. log a training session (sets of weight x reps, optional RPE)
 *  2. review their own history and estimated-1RM progress
 *  3. build their own programs, or copy one from a friend
 *  4. manage friends, and browse/review what friends are doing
 */
export function Dashboard({ me }: { me: User }) {
  const sessions = useAsync(() => api.myHistory(me.id), [me.id]);
  const progress = useAsync(() => api.myProgress(me.id), [me.id]);
  const bodyWeight = useAsync(() => api.bodyWeight(me.id), [me.id]);
  const programs = useAsync(() => api.listPrograms(me.id), [me.id]);
  const incomingRequests = useAsync(
    () => api.friendRequests(me.id, 'incoming'),
    [me.id],
  );
  const [tab, setTab] = useState<Tab>('log');
  const [editingProgram, setEditingProgram] = useState<Program>();

  function refreshWorkoutData() {
    sessions.reload();
    progress.reload();
  }

  return (
    <>
      {/* Top tabs on desktop; the same nav docks to the bottom on a phone. */}
      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => {
              setTab(t.id);
              window.scrollTo({ top: 0 });
            }}
          >
            <span className="tab-label">{t.label}</span>
            {t.id === 'friends' && (incomingRequests.data?.length ?? 0) > 0 && (
              <span className="tab-badge">{incomingRequests.data!.length}</span>
            )}
          </button>
        ))}
      </nav>

      {tab === 'log' && (
        <div className="panel">
          <h2>Log a workout</h2>
          <LogWorkoutForm
            userId={me.id}
            history={sessions.data ?? []}
            onLogged={refreshWorkoutData}
          />
        </div>
      )}

      {tab === 'history' && (
        <>
          {sessions.error && <div className="err">{sessions.error}</div>}
          <HistoryPanel
            sessions={sessions.data ?? []}
            userId={me.id}
            onChanged={refreshWorkoutData}
            onDelete={async (id) => {
              await api.deleteSession(id, me.id);
              refreshWorkoutData();
            }}
          />
        </>
      )}

      {tab === 'stats' && (
        <>
          {(progress.error || bodyWeight.error) && (
            <div className="err">{progress.error ?? bodyWeight.error}</div>
          )}
          <StatsPanel
            userId={me.id}
            sessions={sessions.data ?? []}
            progress={progress.data ?? []}
            bodyWeight={bodyWeight.data ?? []}
            onBodyWeightChanged={bodyWeight.reload}
          />
        </>
      )}

      {tab === 'programs' && (
        <>
          <div className="panel">
            <h2>Your programs</h2>
            {programs.error && <div className="err">{programs.error}</div>}
            <ProgramList
              programs={programs.data ?? []}
              onDelete={async (id) => {
                await api.deleteProgram(id, me.id);
                if (editingProgram?.id === id) setEditingProgram(undefined);
                programs.reload();
              }}
              onEdit={setEditingProgram}
            />
          </div>
          <div className="panel">
            <h2>{editingProgram ? `Edit "${editingProgram.name}"` : 'New program'}</h2>
            <ProgramBuilder
              key={editingProgram?.id ?? 'new'}
              ownerId={me.id}
              existing={editingProgram}
              onCreated={programs.reload}
              onCancel={() => setEditingProgram(undefined)}
            />
          </div>
          <ExerciseLibrary userId={me.id} />
        </>
      )}

      {tab === 'friends' && (
        <FriendsPanel
          me={me}
          onProgramsChanged={programs.reload}
          onRequestsChanged={incomingRequests.reload}
        />
      )}
    </>
  );
}

/**
 * A note-to-self tied to one specific exercise ("brace before every squat"),
 * not the whole session — it's saved per user+exercise, so it shows up again
 * whenever that exercise appears in any future log. The Cue button toggles the
 * popup open and closed — press it again to dismiss. Browser-only
 * (localStorage), not the backend.
 */
function ExerciseTip({
  userId,
  exerciseId,
  exerciseName,
}: {
  userId: string;
  exerciseId: string;
  exerciseName: string;
}) {
  const storageKey = `gym-app.exerciseTip.${userId}.${exerciseId}`;
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setText(localStorage.getItem(storageKey) ?? '');
    } catch {
      setText('');
    }
  }, [storageKey]);

  function save(value: string) {
    setText(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // Private browsing / storage disabled — the tip just won't persist.
    }
  }

  return (
    <>
      <button
        type="button"
        className="ghost small"
        title={text ? `Cue for ${exerciseName}` : `Add a cue for ${exerciseName}`}
        onClick={() => setOpen((o) => !o)}
      >
        Cue
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            className="panel"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420, width: '100%', marginBottom: 0 }}
          >
            <h3>{exerciseName} cue</h3>
            <textarea
              autoFocus
              rows={4}
              value={text}
              onChange={(e) => save(e.target.value)}
              placeholder="e.g. brace before every rep, control the eccentric..."
            />
            <div className="row" style={{ marginTop: '.6rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProgramList({
  programs,
  onDelete,
  onEdit,
}: {
  programs: Program[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (program: Program) => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string>();

  if (programs.length === 0) {
    return (
      <p className="muted">
        No programs yet — build one below, or copy one from a friend.
      </p>
    );
  }

  return (
    <div className="table-scroll">
    <table>
      <thead>
        <tr>
          <th>Program</th>
          <th>Days</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {programs.map((p) => (
          <tr key={p.id}>
            <td>
              <strong>{p.name}</strong>
              <br />
              <span className="muted">{p.lengthWeeks} wk</span>
            </td>
            <td>{p.days.length}</td>
            <td style={{ textAlign: 'right' }}>
              {confirmingId === p.id ? (
                <>
                  <span className="muted">Delete for good?</span>{' '}
                  <button
                    className="small"
                    onClick={() => {
                      onDelete(p.id);
                      setConfirmingId(undefined);
                    }}
                  >
                    Confirm
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
                  <button className="ghost small" onClick={() => onEdit(p)}>
                    Edit
                  </button>{' '}
                  <button className="ghost small" onClick={() => setConfirmingId(p.id)}>
                    Delete
                  </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

interface SetEntry {
  weight: string;
  reps: string;
  rpe: string;
  setType: SetType;
  /** Ticked once the lifter has actually done this set. Weight is optional either way. */
  done: boolean;
  /**
   * Only sent when setType is DROP_SET / SUPERSET respectively; kept
   * otherwise so a mis-click on the type doesn't lose what was typed.
   */
  drops: DropEntry[];
  supersetPartners: PartnerEntry[];
  /** A clip picked for this set; uploaded right after the session is logged. */
  video?: File;
}

/** One box in the log-workout form: an exercise and just its own sets. */
interface ExerciseGroup {
  exerciseId: string;
  sets: SetEntry[];
}

const emptySetEntry: SetEntry = {
  weight: '',
  reps: '',
  rpe: '',
  setType: 'WORKING',
  done: true,
  drops: [],
  supersetPartners: [],
};

const SET_TYPES: SetType[] = ['WORKING', 'WARMUP', 'DROP_SET', 'SUPERSET', 'BACKOFF', 'AMRAP'];

function emptyGroup(): ExerciseGroup {
  return { exerciseId: '', sets: [{ ...emptySetEntry }] };
}

/** Most recent set of the given type logged for each exercise, newest first. */
function lastSetByExercise(
  history: WorkoutSession[],
  type: SetType,
): Map<string, { weight: number; reps: number; date: string }> {
  const map = new Map<string, { weight: number; reps: number; date: string }>();
  for (const session of history) {
    if (session.status === 'SKIPPED') continue;
    for (const set of session.sets) {
      if (set.setType !== type || map.has(set.exercise.id)) continue;
      map.set(set.exercise.id, { weight: set.weight, reps: set.reps, date: session.date });
    }
  }
  return map;
}

function LogWorkoutForm({
  userId,
  history,
  onLogged,
}: {
  userId: string;
  history: WorkoutSession[];
  onLogged: () => void;
}) {
  const exercises = useAsync(() => api.listExercises(userId), [userId]);
  const myPrograms = useAsync(() => api.listPrograms(userId), [userId]);
  const sharedPrograms = useAsync(() => api.sharedPrograms(userId), [userId]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [groups, setGroups] = useState<ExerciseGroup[]>([emptyGroup()]);
  const [programDayId, setProgramDayId] = useState<string>();
  /** Set when the loaded day came from the running block, so logging counts toward it. */
  const [blockDay, setBlockDay] = useState<{ blockId: string; day: BlockDay }>();
  const activeBlock = useAsync(() => api.activeBlock(userId), [userId]);
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<{ index: number; total: number; fraction: number }>();

  // Your own programs plus ones friends have shared with you — a shared
  // program can be followed here (logged against) but stays theirs; it
  // won't show up in "My programs" and can't be edited.
  const followablePrograms = useMemo(
    () => [...(myPrograms.data ?? []), ...(sharedPrograms.data ?? [])],
    [myPrograms.data, sharedPrograms.data],
  );

  const lastByExercise = useMemo(() => lastSetByExercise(history, 'WORKING'), [history]);
  const lastWarmupByExercise = useMemo(() => lastSetByExercise(history, 'WARMUP'), [history]);

  function updateSet(gi: number, si: number, patch: Partial<SetEntry>) {
    setGroups((gs) =>
      gs.map((g, idx) =>
        idx === gi
          ? { ...g, sets: g.sets.map((s, sidx) => (sidx === si ? { ...s, ...patch } : s)) }
          : g,
      ),
    );
  }

  /** Switching a set to "Drop set" or "Superset" opens one empty sub-row straight away, ready to fill in. */
  function changeSetType(gi: number, si: number, setType: SetType) {
    const current = groups[gi].sets[si];
    updateSet(gi, si, {
      setType,
      drops: setType === 'DROP_SET' && current.drops.length === 0 ? [emptyDrop()] : current.drops,
      supersetPartners:
        setType === 'SUPERSET' && current.supersetPartners.length === 0
          ? [emptyPartner()]
          : current.supersetPartners,
    });
  }

  /** Picking an exercise on a box with no weight/reps yet fills in what was last used, so you can see (and tweak) it instead of guessing. */
  function pickExerciseForGroup(gi: number, exerciseId: string) {
    const last = lastByExercise.get(exerciseId);
    setGroups((gs) =>
      gs.map((g, idx) => {
        if (idx !== gi) return g;
        return {
          ...g,
          exerciseId,
          sets: g.sets.map((s) => ({
            ...s,
            weight: s.weight || (last ? String(last.weight) : s.weight),
            reps: s.reps || (last ? String(last.reps) : s.reps),
          })),
        };
      }),
    );
  }

  /** Adds one more set to this box, copied from its last set — the fast way to add "one more set" of the same exercise. */
  function addSetToGroup(gi: number) {
    setGroups((gs) =>
      gs.map((g, idx) =>
        idx === gi
          ? { ...g, sets: [...g.sets, { ...g.sets[g.sets.length - 1], video: undefined }] }
          : g,
      ),
    );
  }

  function moveSet(gi: number, si: number, dir: -1 | 1) {
    setGroups((gs) =>
      gs.map((g, idx) => {
        if (idx !== gi) return g;
        const sj = si + dir;
        if (sj < 0 || sj >= g.sets.length) return g;
        const nextSets = [...g.sets];
        [nextSets[si], nextSets[sj]] = [nextSets[sj], nextSets[si]];
        return { ...g, sets: nextSets };
      }),
    );
  }


  /** Removing a box's last set removes the whole box — a box with no sets isn't useful. */
  function removeSet(gi: number, si: number) {
    setGroups((gs) => {
      const g = gs[gi];
      if (g.sets.length <= 1) return gs.length === 1 ? [emptyGroup()] : gs.filter((_, idx) => idx !== gi);
      return gs.map((gg, idx) =>
        idx === gi ? { ...gg, sets: gg.sets.filter((_, sidx) => sidx !== si) } : gg,
      );
    });
  }

  function removeGroup(gi: number) {
    setGroups((gs) => (gs.length === 1 ? [emptyGroup()] : gs.filter((_, idx) => idx !== gi)));
  }

  function addGroup() {
    setGroups((gs) => [...gs, emptyGroup()]);
  }

  /** Loads a day from the running block into the form; logging it then ticks it off. */
  function trainBlockDay(block: TrainingBlock, day: BlockDay) {
    const programDay = followablePrograms
      .find((p) => p.id === block.program.id)
      ?.days.find((d) => d.id === day.programDayId);
    if (!programDay) {
      setError("Couldn't load that day — the program may no longer be shared with you.");
      return;
    }
    loadDay(programDay);
    setBlockDay({ blockId: block.id, day });
  }

  /** Fills the form with a planned day's prescribed sets. */
  function loadDay(day: ProgramDay) {
    const loaded: ExerciseGroup[] = [];
    for (const pe of [...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex)) {
      const last = lastByExercise.get(pe.exercise.id);
      const sets: SetEntry[] = [];
      for (let setNum = 1; setNum <= pe.targetSets; setNum++) {
        sets.push({
          // A coach-prescribed weight wins over what you last happened to lift.
          weight: pe.targetWeight != null ? String(pe.targetWeight) : last ? String(last.weight) : '',
          reps: String(pe.targetReps),
          rpe: pe.targetRpe != null ? String(pe.targetRpe) : '',
          setType: pe.setType ?? 'WORKING',
          done: false,
          drops: [],
          supersetPartners: [],
        });
      }
      // Consecutive lines of the same exercise (e.g. a top set followed by
      // its back-offs) belong in one box, not one box per line.
      const previous = loaded[loaded.length - 1];
      if (previous?.exerciseId === pe.exercise.id) previous.sets.push(...sets);
      else loaded.push({ exerciseId: pe.exercise.id, sets });
    }
    setGroups(loaded.length > 0 ? loaded : [emptyGroup()]);
    setProgramDayId(day.id);
    setOk(undefined);
    setError(undefined);
  }

  function clearPlan() {
    setGroups([emptyGroup()]);
    setProgramDayId(undefined);
    setBlockDay(undefined);
  }

  // Sets marked "done" with reps filled in — the same rule save() uses to
  // decide what's worth submitting. Also drives the "don't forget to save"
  // reminder: nothing is written to the server until Log session is pressed.
  const usableGroups = useMemo(
    () =>
      groups
        .filter((g) => g.exerciseId)
        .map((g) => ({ exerciseId: g.exerciseId, sets: g.sets.filter((s) => s.done && s.reps) }))
        .filter((g) => g.sets.length > 0),
    [groups],
  );
  const pendingSetCount = usableGroups.reduce((sum, g) => sum + g.sets.length, 0);

  async function save() {
    setError(undefined);
    setOk(undefined);
    if (usableGroups.length === 0) {
      setError('Mark at least one set done with an exercise and reps.');
      return;
    }
    setBusy(true);
    try {
      const logged = await api.logSession({
        userId,
        programDayId,
        blockId: blockDay?.blockId,
        date,
        notes: notes || undefined,
        status: 'COMPLETED',
        sets: usableGroups.flatMap((g) =>
          g.sets.map((s, i) => ({
            exerciseId: g.exerciseId,
            setNumber: i + 1,
            weight: s.weight ? Number(s.weight) : 0,
            reps: Number(s.reps),
            rpe: s.rpe ? Number(s.rpe) : undefined,
            setType: s.setType,
            drops: s.setType === 'DROP_SET' ? dropsPayload(s.drops) : undefined,
            supersetPartners:
              s.setType === 'SUPERSET' ? partnersPayload(s.supersetPartners) : undefined,
          })),
        ),
      });
      // The API saves sets in the order they were sent, so the Nth set sent
      // is the Nth set back — that's how each picked video finds its set.
      const videos = usableGroups
        .flatMap((g) => g.sets)
        .map((s, i) => ({ file: s.video, setId: logged.sets[i]?.id }))
        .filter((v): v is { file: File; setId: string } => !!v.file && !!v.setId);
      const failed: string[] = [];
      for (const [i, v] of videos.entries()) {
        setUploading({ index: i + 1, total: videos.length, fraction: 0 });
        try {
          await api.uploadSetVideo(v.setId, userId, v.file, (fraction) =>
            setUploading({ index: i + 1, total: videos.length, fraction }),
          );
        } catch (err) {
          failed.push((err as Error).message);
        }
      }
      setUploading(undefined);
      clearPlan();
      setNotes('');
      setOk(blockDay ? `Session logged — Week ${blockDay.day.week} · ${blockDay.day.name} ticked off.` : 'Session logged.');
      if (failed.length > 0) {
        setError(
          `${failed.length} video upload(s) failed (${failed[0]}). The session is saved — retry from History.`,
        );
      }
      onLogged();
      activeBlock.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setUploading(undefined);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save();
  }

  // Warn before an accidental tab close/refresh if there's marked-done work
  // that was never saved.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (pendingSetCount > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pendingSetCount]);

  // If you mark sets done and then go quiet for a few minutes without
  // saving, gently remind you instead of silently losing the work.
  const [reminderVisible, setReminderVisible] = useState(false);
  const [snoozeTick, setSnoozeTick] = useState(0);

  useEffect(() => {
    if (pendingSetCount === 0) {
      setReminderVisible(false);
      return;
    }
    const REMINDER_DELAY_MS = 3 * 60 * 1000;
    const timer = setTimeout(() => setReminderVisible(true), REMINDER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pendingSetCount, snoozeTick]);

  return (
    <form onSubmit={submit}>
      {error && <div className="err">{error}</div>}
      {ok && <p className="pr">{ok}</p>}

      {reminderVisible && (
        <div
          className="panel"
          style={{
            background: 'var(--accent-weak)',
            borderColor: 'var(--accent)',
            marginBottom: '.75rem',
          }}
        >
          <strong>Don't forget to save</strong>{' '}
          <span className="muted">
            You've marked {pendingSetCount} set{pendingSetCount === 1 ? '' : 's'} done but
            haven't logged this session yet.
          </span>
          <div className="row" style={{ marginTop: '.5rem' }}>
            <button type="button" disabled={busy} onClick={save}>
              Save now
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setReminderVisible(false);
                setSnoozeTick((t) => t + 1);
              }}
            >
              Remind me later
            </button>
          </div>
        </div>
      )}

      <BlockPicker
        userId={userId}
        block={activeBlock.data}
        programs={followablePrograms}
        onChange={activeBlock.reload}
        onLoadDay={trainBlockDay}
        dayLoaded={blockDay !== undefined}
        onClear={clearPlan}
      />

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginTop: '.5rem' }}>
        {groups.map((g, gi) => (
          <div
            key={gi}
            className="panel"
            style={{ background: 'var(--panel-2)', padding: '.75rem' }}
          >
            <div className="row" style={{ alignItems: 'center', marginBottom: '.5rem' }}>
              <ExercisePicker
                style={{ flex: 1 }}
                exercises={exercises.data ?? []}
                value={g.exerciseId}
                onChange={(id) => pickExerciseForGroup(gi, id)}
              />
              {g.exerciseId && (
                <ExerciseTip
                  userId={userId}
                  exerciseId={g.exerciseId}
                  exerciseName={
                    exercises.data?.find((ex) => ex.id === g.exerciseId)?.name ?? 'Exercise'
                  }
                />
              )}
              <button
                type="button"
                className="ghost small"
                title="Remove this exercise and all its sets"
                onClick={() => removeGroup(gi)}
              >
                Remove exercise ✕
              </button>
            </div>

            {/* Grid rows, not a table: on a phone each set wraps onto two lines instead of scrolling sideways. */}
            <div className="set-grid">
              <div className="set-grid-head">
                <span>Set</span>
                <span>Weight (kg)</span>
                <span>Reps</span>
                <span>RPE</span>
                <span>Type</span>
                <span />
              </div>
              {g.sets.map((s, si) => (
                <Fragment key={si}>
                  <div className={`set-row${s.done ? ' done' : ''}`}>
                    <button
                      type="button"
                      className={`set-done ${s.done ? '' : 'ghost'}`}
                      onClick={() => updateSet(gi, si, { done: !s.done })}
                      title={s.done ? 'Marked done — tap to undo' : 'Mark this set as done'}
                    >
                      {s.done ? '✓' : si + 1}
                      {programDayId && <span className="set-planned">/{g.sets.length}</span>}
                    </button>
                    <div className="set-field">
                      <label className="set-label">kg</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={0.5}
                        value={s.weight}
                        onChange={(e) => updateSet(gi, si, { weight: e.target.value })}
                        placeholder="—"
                      />
                      {g.exerciseId &&
                        (() => {
                          const map = s.setType === 'WARMUP' ? lastWarmupByExercise : lastByExercise;
                          const last = map.get(g.exerciseId);
                          if (!last) return null;
                          return (
                            <div className="set-last muted">
                              last {last.weight}×{last.reps}
                            </div>
                          );
                        })()}
                    </div>
                    <div className="set-field">
                      <label className="set-label">reps</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={s.reps}
                        onChange={(e) => updateSet(gi, si, { reps: e.target.value })}
                      />
                    </div>
                    <div className="set-field">
                      <label className="set-label">RPE</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={1}
                        max={10}
                        step={0.5}
                        value={s.rpe}
                        onChange={(e) => updateSet(gi, si, { rpe: e.target.value })}
                      />
                    </div>
                    <select
                      className="set-type-select"
                      value={s.setType}
                      onChange={(e) => changeSetType(gi, si, e.target.value as SetType)}
                      aria-label="Set type"
                    >
                      {SET_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {SET_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    <div className="set-actions">
                      <PendingVideoButton
                        file={s.video}
                        onChange={(video) => updateSet(gi, si, { video })}
                      />
                      <button
                        type="button"
                        className="ghost small"
                        title="Move up"
                        onClick={() => moveSet(gi, si, -1)}
                        disabled={si === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="ghost small"
                        title="Move down"
                        onClick={() => moveSet(gi, si, 1)}
                        disabled={si === g.sets.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="ghost small"
                        title="Remove this set"
                        onClick={() => removeSet(gi, si)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {(s.setType === 'DROP_SET' || s.setType === 'SUPERSET') && (
                    <div className="set-extras">
                      {s.setType === 'DROP_SET' ? (
                        <DropRows drops={s.drops} onChange={(drops) => updateSet(gi, si, { drops })} />
                      ) : (
                        <SupersetRows
                          partners={s.supersetPartners}
                          exercises={exercises.data ?? []}
                          onChange={(supersetPartners) => updateSet(gi, si, { supersetPartners })}
                        />
                      )}
                    </div>
                  )}
                </Fragment>
              ))}
            </div>

            <button
              type="button"
              className="ghost small"
              style={{ marginTop: '.5rem' }}
              onClick={() => addSetToGroup(gi)}
              disabled={!g.exerciseId}
            >
              + Add set
            </button>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: '.75rem' }}>
        <button type="button" className="ghost" onClick={addGroup}>
          + Add exercise
        </button>
        <button disabled={busy}>{uploading ? 'Uploading…' : 'Log session'}</button>
      </div>
      {uploading && (
        <div style={{ marginTop: '.5rem' }}>
          <UploadProgress
            fraction={uploading.fraction}
            label={`Uploading video ${uploading.index} of ${uploading.total} · ${Math.round(uploading.fraction * 100)}%`}
          />
        </div>
      )}
    </form>
  );
}
