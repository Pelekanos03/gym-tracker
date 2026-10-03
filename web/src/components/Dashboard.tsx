import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import type {
  BlockDay,
  Program,
  ProgramDay,
  SetType,
  TrainingBlock,
  User,
  WeightReminder,
  WorkoutSession,
} from '../types';
import { SET_TYPE_LABELS } from '../types';
import { TABS, type Badges, type Tab } from '../sections';
import { newKey } from '../keys';
import { ProgramBuilder } from './ProgramBuilder';
import { FriendsPanel } from './FriendsPanel';
import { HistoryPanel } from './HistoryPanel';
import { StatsPanel } from './StatsPanel';
import { PendingVideoButton, UploadProgress, VideoNoteDialog } from './SetVideo';
import { SwipeToDelete } from './SwipeToDelete';
import { Overlay } from './Overlay';
import { useWorkoutDraft } from './useWorkoutDraft';
import { CardioPanel } from './CardioPanel';
import { MessagesPanel } from './MessagesPanel';
import { WeightReminderBar } from './WeightReminder';
import { todayString, weightReminderDue } from '../stats';
import { SortableItem, SortableList } from './Sortable';
import { arrayMove } from '@dnd-kit/sortable';
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
import { decimalInput } from '../decimal';



/**
 * What a user does here:
 *  1. log a training session (sets of weight x reps, optional RPE)
 *  2. review their own history and estimated-1RM progress
 *  3. build their own programs, or copy one from a friend
 *  4. manage friends, and browse/review what friends are doing
 */
export function Dashboard({
  me,
  tab,
  onTabChange: setTab,
  onBadges,
}: {
  me: User;
  /** Which section is showing — owned by App, so the phone menu can switch it too. */
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  /** Pending friend requests and unread messages, for the badges in the phone menu. */
  onBadges?: (badges: Badges) => void;
}) {
  const sessions = useAsync(() => api.myHistory(me.id), [me.id]);
  const progress = useAsync(() => api.myProgress(me.id), [me.id]);
  const bodyWeight = useAsync(() => api.bodyWeight(me.id), [me.id]);
  const programs = useAsync(() => api.listPrograms(me.id), [me.id]);
  const incomingRequests = useAsync(
    () => api.friendRequests(me.id, 'incoming'),
    [me.id],
  );
  // Follows `me` (which is refreshed from the server after a cached first
  // render); a change made here wins until the next refresh.
  const [reminderChoice, setWeightReminder] = useState<WeightReminder>();
  const weightReminder: WeightReminder = reminderChoice ?? me.weightReminder ?? 'off';
  const incomingCount = incomingRequests.data?.length ?? 0;

  // Unread chat messages: checked every 30s (and right after reading some).
  const [unread, setUnread] = useState(0);
  const refreshUnread = useCallback(() => {
    api
      .unreadMessages()
      .then((r) => setUnread(r.count))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    refreshUnread();
    const t = window.setInterval(() => document.visibilityState === 'visible' && refreshUnread(), 30_000);
    return () => window.clearInterval(t);
  }, [refreshUnread]);

  useEffect(() => onBadges?.({ friends: incomingCount, messages: unread }), [incomingCount, unread, onBadges]);
  const badges: Badges = { friends: incomingCount, messages: unread };
  const [editingProgram, setEditingProgram] = useState<Program>();
  /** The History session the Workout form is saving into, and requests from History to it. */
  const [activeSessionId, setActiveSessionId] = useState<string>();
  const [logCommand, setLogCommand] = useState<LogCommand>();

  function refreshWorkoutData() {
    sessions.reload();
    progress.reload();
  }

  return (
    <>
      {/* Top tabs on desktop; on a phone these move into the ☰ menu. */}
      <nav className="tabs section-tabs" aria-label="Sections">
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
            {(badges[t.id as keyof Badges] ?? 0) > 0 && (
              <span className="tab-badge">{badges[t.id as keyof Badges]}</span>
            )}
          </button>
        ))}
      </nav>

      {bodyWeight.data && weightReminderDue(weightReminder, bodyWeight.data) && (
        <WeightReminderBar userId={me.id} onLogged={bodyWeight.reload} />
      )}

      {/* Kept mounted (only hidden) on other tabs, so a workout in progress is never thrown away. */}
      <div className="panel" hidden={tab !== 'log'}>
        <h2>Log a workout</h2>
        <LogWorkoutForm
          userId={me.id}
          history={sessions.data ?? []}
          onLogged={refreshWorkoutData}
          command={logCommand}
          onActiveSession={setActiveSessionId}
        />
      </div>

      {tab === 'cardio' && <CardioPanel userId={me.id} />}

      {tab === 'messages' && <MessagesPanel meId={me.id} onRead={refreshUnread} />}

      {tab === 'history' && (
        <>
          {sessions.error && <div className="err">{sessions.error}</div>}
          <HistoryPanel
            sessions={sessions.data ?? []}
            userId={me.id}
            onChanged={refreshWorkoutData}
            onDelete={async (id) => {
              // Deleting the workout being logged clears the form, or its next save would bring it back.
              if (id === activeSessionId) setLogCommand({ kind: 'reset', nonce: Date.now() });
              await api.deleteSession(id, me.id);
              refreshWorkoutData();
            }}
            activeSessionId={activeSessionId}
            onContinue={(session) => {
              if (session.id !== activeSessionId) {
                setLogCommand({ kind: 'continue', session, nonce: Date.now() });
              }
              setTab('log');
              window.scrollTo({ top: 0 });
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
            reminder={weightReminder}
            onReminderChange={setWeightReminder}
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
              onEdit={(p) => {
                setEditingProgram(p);
                // The form is below the list — bring it into view.
                requestAnimationFrame(() =>
                  document.getElementById('program-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                );
              }}
            />
          </div>
          <div className="panel">
            <div className="panel-head" id="program-form">
              <h2>{editingProgram ? `Edit "${editingProgram.name}"` : 'New program'}</h2>
              {editingProgram && (
                <button type="button" className="ghost small" onClick={() => setEditingProgram(undefined)}>
                  ✕ Close
                </button>
              )}
            </div>
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
        <Overlay>
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
        </Overlay>
      )}
    </>
  );
}

/** A set whose clip is already uploaded: "Video ✓" — tap to add or change its comment. */
function SavedVideoBadge({ note, onNoteChange }: { note: string; onNoteChange: (note: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="small video-attached"
        onClick={() => setOpen(true)}
        title="Video saved — tap to comment on it. Watch it in History."
      >
        Video ✓{note && ' 💬'}
      </button>
      {open && <VideoNoteDialog note={note} onChange={onNoteChange} onClose={() => setOpen(false)} />}
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
    <div className="program-list">
      {programs.map((p) => (
        <SwipeToDelete key={p.id} onDelete={() => setConfirmingId(p.id)}>
          <div className="program-row">
            <button type="button" className="program-main" onClick={() => onEdit(p)}>
              <strong>{p.name}</strong>
              <span className="muted">
                {p.lengthWeeks} wk · {p.days.length} day{p.days.length === 1 ? '' : 's'}
              </span>
            </button>
            {confirmingId === p.id ? (
              <div className="program-actions">
                <span className="muted">Delete for good?</span>
                <button
                  className="small danger"
                  onClick={() => {
                    onDelete(p.id);
                    setConfirmingId(undefined);
                  }}
                >
                  Delete
                </button>
                <button className="ghost small" onClick={() => setConfirmingId(undefined)}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="program-actions">
                <button className="ghost small" onClick={() => onEdit(p)}>
                  Edit
                </button>
                <button className="ghost small desktop-only" onClick={() => setConfirmingId(p.id)}>
                  Delete
                </button>
              </div>
            )}
          </div>
        </SwipeToDelete>
      ))}
    </div>
  );
}

interface SetEntry {
  /** Stable key, so a set keeps its identity while being dragged around. */
  id: string;
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
  /** A clip picked for this set; uploaded once the set has been saved. */
  video?: File;
  /** The clip once it's on the server — sent back on every save so it's kept. */
  videoFile?: string | null;
  /** The lifter's comment on the clip, saved with the set. */
  videoNote?: string | null;
}

/** One box in the log-workout form: an exercise and just its own sets. */
interface ExerciseGroup {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
}


function emptySet(): SetEntry {
  return {
    id: newKey(),
    weight: '',
    reps: '',
    rpe: '',
    setType: 'WORKING',
    // Ticking a set is what saves it, so a new one starts unticked.
    done: false,
    drops: [],
    supersetPartners: [],
  };
}

/** Moves the item with id `from` to where the item `to` is. */
function moveById<T extends { id: string }>(items: T[], from: string, to: string): T[] {
  const i = items.findIndex((x) => x.id === from);
  const j = items.findIndex((x) => x.id === to);
  return i < 0 || j < 0 ? items : arrayMove(items, i, j);
}

const SET_TYPES: SetType[] = ['WORKING', 'WARMUP', 'DROP_SET', 'SUPERSET', 'BACKOFF', 'AMRAP'];

function emptyGroup(): ExerciseGroup {
  return { id: newKey(), exerciseId: '', sets: [emptySet()] };
}

/** A logged session back as form boxes (every set ticked), to carry on with it. */
function groupsFromSession(session: WorkoutSession): ExerciseGroup[] {
  const out: ExerciseGroup[] = [];
  for (const s of session.sets) {
    const entry: SetEntry = {
      id: newKey(),
      weight: s.weight ? String(s.weight) : '',
      reps: String(s.reps),
      rpe: s.rpe != null ? String(s.rpe) : '',
      setType: s.setType,
      done: true,
      drops: (s.drops ?? []).map((d) => ({ weight: String(d.weight), reps: String(d.reps) })),
      supersetPartners: (s.supersetPartners ?? []).map((p) => ({
        exerciseId: p.exercise.id,
        weight: String(p.weight),
        reps: String(p.reps),
      })),
      videoFile: s.videoFile,
      videoNote: s.videoNote,
    };
    const previous = out[out.length - 1];
    if (previous?.exerciseId === s.exercise.id) previous.sets.push(entry);
    else out.push({ id: newKey(), exerciseId: s.exercise.id, sets: [entry] });
  }
  return out.length > 0 ? out : [emptyGroup()];
}

/**
 * What the server should hold for the form right now: every ticked set
 * with an exercise and reps. `keys` lines up with `sets` (the API keeps the
 * order), so a picked video can find the set it belongs to after a save.
 */
function sessionBody(
  groups: ExerciseGroup[],
  form: { date: string; notes: string; programDayId?: string },
  uploaded: Map<string, string>,
) {
  const keys: string[] = [];
  const sets = groups
    .filter((g) => g.exerciseId)
    .flatMap((g) =>
      g.sets
        .filter((s) => s.done && s.reps)
        .map((s, i) => {
          keys.push(s.id);
          return {
            exerciseId: g.exerciseId,
            setNumber: i + 1,
            weight: s.weight ? Number(s.weight) : 0,
            reps: Number(s.reps),
            rpe: s.rpe ? Number(s.rpe) : undefined,
            setType: s.setType,
            drops: s.setType === 'DROP_SET' ? dropsPayload(s.drops) : undefined,
            supersetPartners: s.setType === 'SUPERSET' ? partnersPayload(s.supersetPartners) : undefined,
            videoFile: s.videoFile ?? uploaded.get(s.id) ?? undefined,
            videoNote: s.videoNote || undefined,
          };
        }),
    );
  return {
    keys,
    body: {
      date: form.date,
      notes: form.notes || undefined,
      programDayId: form.programDayId,
      status: 'COMPLETED' as const,
      sets,
    },
  };
}

/** Something Dashboard asks the log form to do (from History). `nonce` makes a repeat count. */
export type LogCommand =
  | { kind: 'continue'; session: WorkoutSession; nonce: number }
  | { kind: 'reset'; nonce: number };

/** Most recent set of the given type logged for each exercise, newest first. */
function lastSetByExercise(
  history: WorkoutSession[],
  type: SetType,
  skipSessionId?: string,
): Map<string, { weight: number; reps: number; date: string }> {
  const map = new Map<string, { weight: number; reps: number; date: string }>();
  for (const session of history) {
    // The workout being logged right now is in history too — "last" means before it.
    if (session.status === 'SKIPPED' || session.id === skipSessionId) continue;
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
  command,
  onActiveSession,
}: {
  userId: string;
  history: WorkoutSession[];
  onLogged: () => void;
  command?: LogCommand;
  /** The History session this form is writing to, if any. */
  onActiveSession: (id: string | undefined) => void;
}) {
  const exercises = useAsync(() => api.listExercises(userId), [userId]);
  const myPrograms = useAsync(() => api.listPrograms(userId), [userId]);
  const sharedPrograms = useAsync(() => api.sharedPrograms(userId), [userId]);
  const [date, setDate] = useState(todayString);
  const [notes, setNotes] = useState('');
  const [groups, setGroups] = useState<ExerciseGroup[]>([emptyGroup()]);
  const [programDayId, setProgramDayId] = useState<string>();
  /** Set when the loaded day came from the running block, so logging counts toward it. */
  const [blockDay, setBlockDay] = useState<{ blockId: string; day: BlockDay }>();
  const activeBlock = useAsync(() => api.activeBlock(userId), [userId]);
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const [uploading, setUploading] = useState<{ fraction: number }>();
  /** The History session ticked sets are saved into; made by the first tick. */
  const [sessionId, setSessionId] = useState<string>();
  /** Picked up a workout already in History (after a reload, or Continue) — for the note at the top. */
  const [resumed, setResumed] = useState(false);
  const [sync, setSync] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; message?: string }>({
    state: 'idle',
  });

  useEffect(() => onActiveSession(sessionId), [sessionId, onActiveSession]);

  // Saved as you go and restored automatically (see useWorkoutDraft).
  // Picked videos are files on the phone and can't be saved — they're left out.
  const draft = useWorkoutDraft({
    userId,
    data: useMemo(
      () => ({
        date,
        notes,
        programDayId,
        blockDay,
        sessionId,
        savedOn: todayString(),
        groups: groups.map((g) => ({ ...g, sets: g.sets.map(({ video: _video, ...rest }) => rest) })),
      }),
      [date, notes, programDayId, blockDay, sessionId, groups],
    ),
    isEmpty: (d) => !d.notes && !d.groups.some((g) => g.exerciseId || g.sets.some((x) => x.weight || x.reps)),
    restore: (d) => {
      // Yesterday's workout is already in History (Continue it from there);
      // a new day starts with a fresh form instead of adding to it.
      if (d.sessionId && d.savedOn !== todayString()) return;
      setDate(d.date);
      setNotes(d.notes);
      setProgramDayId(d.programDayId);
      setBlockDay(d.blockDay);
      setSessionId(d.sessionId);
      setResumed(!!d.sessionId);
      // Fresh keys: the saved ones came from another page load and could clash.
      setGroups(d.groups.map((g) => ({ ...g, id: newKey(), sets: g.sets.map((x) => ({ ...x, id: newKey() })) })));
    },
  });

  // --- live saving -------------------------------------------------------
  // Every tick (and any later change to a ticked set) is written to the
  // session in History. One save runs at a time; changes made meanwhile are
  // picked up by the next round, so saves and video uploads never overlap.
  const latest = useRef({ groups, date, notes, programDayId, blockDay, sessionId });
  const onLoggedRef = useRef(onLogged);
  const reloadBlockRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    latest.current = { groups, date, notes, programDayId, blockDay, sessionId };
    onLoggedRef.current = onLogged;
    reloadBlockRef.current = activeBlock.reload;
  });
  /** Videos uploaded but maybe not yet in `groups` state — never dropped by a save. */
  const uploadedVideos = useRef(new Map<string, string>());
  const failedVideos = useRef(new Set<string>());
  /** The body last written to the server, to skip saves that change nothing. */
  const lastSaved = useRef<string | undefined>(undefined);
  const inFlight = useRef<Promise<boolean> | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  /** Bumped when the form is reset, so a save still in flight can't re-attach the old session. */
  const generation = useRef(0);

  /** Brings the server up to date with the form. Resolves false if it couldn't. */
  const runSync = useCallback((): Promise<boolean> => {
    window.clearTimeout(timer.current);
    // Already saving: let that finish, then go again for anything newer.
    if (inFlight.current) return inFlight.current.then(() => runSync());
    const gen = generation.current;
    const run = (async () => {
      let changed = false;
      // Yield first, so `inFlight` is set below before the finally clause can clear it.
      await null;
      try {
        for (;;) {
          if (gen !== generation.current) return true;
          const cur = latest.current;
          const { keys, body } = sessionBody(cur.groups, cur, uploadedVideos.current);
          const key = JSON.stringify(body);
          const allSets = cur.groups.flatMap((g) => g.sets);
          const pendingVideos = keys
            .map((k, i) => ({ i, k, file: allSets.find((s) => s.id === k)?.video }))
            .filter(
              (v): v is { i: number; k: string; file: File } =>
                !!v.file && !uploadedVideos.current.has(v.k) && !failedVideos.current.has(v.k),
            );
          if (key === lastSaved.current && pendingVideos.length === 0) break;

          let id = cur.sessionId;
          if (body.sets.length === 0 && !id) {
            lastSaved.current = key; // nothing ticked yet, nothing to save
            continue;
          }
          setSync({ state: 'saving' });
          let saved: WorkoutSession | null = null;
          if (body.sets.length === 0) {
            // Every set unticked: an empty session isn't worth keeping.
            await api.deleteSession(id!, userId).catch(() => undefined);
            id = undefined;
          } else if (id) {
            saved = await api.updateSession(id, { ...body, userId }).catch((err: Error) => {
              // Deleted elsewhere (another phone): start it again rather than lose the sets.
              if (/not found/i.test(err.message)) return null;
              throw err;
            });
            if (!saved) {
              latest.current.sessionId = undefined;
              continue;
            }
          } else {
            saved = await api.logSession({ ...body, userId, blockId: cur.blockDay?.blockId });
            id = saved.id;
            reloadBlockRef.current();
          }
          if (gen !== generation.current) return true;
          latest.current.sessionId = id;
          setSessionId(id);
          lastSaved.current = key;
          changed = true;

          // Upload any picked videos now that their sets exist on the server.
          for (const v of saved ? pendingVideos : []) {
            const setId = saved!.sets[v.i]?.id;
            if (!setId) continue;
            setUploading({ fraction: 0 });
            try {
              const res = await api.uploadSetVideo(setId, userId, v.file, (fraction) => setUploading({ fraction }));
              uploadedVideos.current.set(v.k, res.videoFile);
              setGroups((gs) =>
                gs.map((g) => ({
                  ...g,
                  sets: g.sets.map((s) => (s.id === v.k ? { ...s, video: undefined, videoFile: res.videoFile } : s)),
                })),
              );
              // The upload attached it server-side; the next round sends it back so it's kept.
              lastSaved.current = undefined;
            } catch (err) {
              failedVideos.current.add(v.k);
              setError(`A video didn't upload (${(err as Error).message}). The set is saved — add the video from History.`);
            } finally {
              setUploading(undefined);
            }
          }
        }
        if (gen === generation.current) setSync({ state: latest.current.sessionId ? 'saved' : 'idle' });
        return true;
      } catch (err) {
        setSync({ state: 'error', message: (err as Error).message });
        // Try again shortly — the sets are still safe in the draft meanwhile.
        timer.current = window.setTimeout(() => void runSync(), 5000);
        return false;
      } finally {
        inFlight.current = undefined;
        if (changed) onLoggedRef.current();
      }
    })();
    inFlight.current = run;
    return run;
  }, [userId]);

  // Any change saves: a tick straight away, typing once it pauses.
  const urgentSync = useRef(false);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void runSync(), urgentSync.current ? 0 : 1000);
    urgentSync.current = false;
  }, [groups, date, notes, programDayId, runSync]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** Start a fresh form; whatever was ticked is already in History. */
  function resetForm() {
    window.clearTimeout(timer.current);
    generation.current++;
    setGroups([emptyGroup()]);
    setNotes('');
    setDate(todayString());
    setProgramDayId(undefined);
    setBlockDay(undefined);
    setSessionId(undefined);
    setResumed(false);
    latest.current = { ...latest.current, sessionId: undefined };
    lastSaved.current = undefined;
    uploadedVideos.current.clear();
    failedVideos.current.clear();
    setSync({ state: 'idle' });
  }

  async function finish() {
    setError(undefined);
    if (!(await runSync())) return; // keep everything on screen until it's saved
    resetForm();
    setOk('Workout saved — it’s in History, and you can continue it from there.');
  }

  // History asked for something: carry on with a logged session, or drop one that was deleted.
  const lastCommand = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!command || command.nonce === lastCommand.current) return;
    lastCommand.current = command.nonce;
    resetForm();
    setOk(undefined);
    setError(undefined);
    if (command.kind === 'continue') {
      const s = command.session;
      setGroups(groupsFromSession(s));
      setDate(s.date.slice(0, 10));
      setNotes(s.notes);
      setProgramDayId(s.programDay?.id);
      setSessionId(s.id);
      setResumed(true);
      latest.current.sessionId = s.id;
    }
  }, [command]);

  // Your own programs plus ones friends have shared with you — a shared
  // program can be followed here (logged against) but stays theirs; it
  // won't show up in "My programs" and can't be edited.
  const followablePrograms = useMemo(
    () => [...(myPrograms.data ?? []), ...(sharedPrograms.data ?? [])],
    [myPrograms.data, sharedPrograms.data],
  );

  const lastByExercise = useMemo(() => lastSetByExercise(history, 'WORKING', sessionId), [history, sessionId]);
  const lastWarmupByExercise = useMemo(
    () => lastSetByExercise(history, 'WARMUP', sessionId),
    [history, sessionId],
  );

  function updateSet(gi: number, si: number, patch: Partial<SetEntry>) {
    if ('done' in patch) {
      // A tick is saved immediately — to History and to the draft.
      draft.saveNow();
      urgentSync.current = true;
    }
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

  /** Planned days load with every set "not done"; this ticks a whole exercise at once. */
  function markAllDone(gi: number) {
    draft.saveNow();
    urgentSync.current = true;
    setGroups((gs) =>
      gs.map((g, idx) => (idx === gi ? { ...g, sets: g.sets.map((x) => ({ ...x, done: true })) } : g)),
    );
  }

  /** Adds one more set to this box, copied from its last set (not yet ticked) — the fast way to add "one more set". */
  function addSetToGroup(gi: number) {
    setGroups((gs) =>
      gs.map((g, idx) =>
        idx === gi
          ? {
              ...g,
              sets: [
                ...g.sets,
                {
                  ...g.sets[g.sets.length - 1],
                  id: newKey(),
                  done: false,
                  video: undefined,
                  videoFile: undefined,
                  videoNote: undefined,
                },
              ],
            }
          : g,
      ),
    );
  }

  /** Drag-and-drop: a set dropped onto another set's place within the same exercise. */
  function moveSet(gi: number, from: string, to: string) {
    setGroups((gs) => gs.map((g, idx) => (idx === gi ? { ...g, sets: moveById(g.sets, from, to) } : g)));
  }

  /** Drag-and-drop: a whole exercise moved to another exercise's place. */
  function moveGroup(from: string, to: string) {
    setGroups((gs) => moveById(gs, from, to));
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

  /** Fills the form with a planned day's prescribed sets — as a new workout if one is going. */
  function loadDay(day: ProgramDay) {
    if (sessionId) resetForm();
    const loaded: ExerciseGroup[] = [];
    for (const pe of [...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex)) {
      const last = lastByExercise.get(pe.exercise.id);
      const sets: SetEntry[] = [];
      for (let setNum = 1; setNum <= pe.targetSets; setNum++) {
        sets.push({
          id: newKey(),
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
      else loaded.push({ id: newKey(), exerciseId: pe.exercise.id, sets });
    }
    setGroups(loaded.length > 0 ? loaded : [emptyGroup()]);
    setProgramDayId(day.id);
    setOk(undefined);
    setError(undefined);
  }

  // Sets ticked with reps filled in — exactly what's saved to History.
  const doneSetCount = groups
    .filter((g) => g.exerciseId)
    .reduce((sum, g) => sum + g.sets.filter((x) => x.done && x.reps).length, 0);
  /** All sets with an exercise and reps — done or not — for the "3 of 12 done" counter. */
  const totalSetCount = groups
    .filter((g) => g.exerciseId)
    .reduce((sum, g) => sum + g.sets.filter((x) => x.reps).length, 0);
  // No "Leave site?" warning on reload/close: ticked sets are already in
  // History, and anything not yet saved is kept in the draft and saved the
  // next time the app opens.

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault(); // Enter in a field: just save now
        void runSync();
      }}
    >
      {error && <div className="err">{error}</div>}
      {ok && <p className="pr">{ok}</p>}

      {sessionId && resumed && totalSetCount > 0 && (
        <p className="draft-note muted">
          Carrying on with your workout — every ticked set is already in History.
        </p>
      )}

      <BlockPicker
        userId={userId}
        block={activeBlock.data}
        programs={followablePrograms}
        onChange={activeBlock.reload}
        onLoadDay={trainBlockDay}
        dayLoaded={blockDay !== undefined}
        onClear={resetForm}
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

      {/*
        Exercises and their sets can be reordered by dragging the ⋮⋮ grip.
        On a phone the remove buttons give way to swipe-to-delete: swipe a
        set (or an exercise's name row) sideways, then tap Delete.
      */}
      {totalSetCount > doneSetCount && doneSetCount === 0 && (
        <p className="plan-hint">
          Tap a set's number when you've done it — it turns green ✓ and is saved to History straight away.
          Change the weight or reps first if you did something different.
        </p>
      )}
      <div className="exercise-list">
        <SortableList ids={groups.map((g) => g.id)} onMove={moveGroup}>
          {groups.map((g, gi) => (
            <SortableItem key={g.id} id={g.id} className="panel exercise-box">
              {(groupHandle) => (
                <>
                  <SwipeToDelete onDelete={() => removeGroup(gi)} label="Remove">
                    <div className="exercise-head">
                      {groupHandle}
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
                        className="ghost small desktop-only"
                        title="Remove this exercise and all its sets"
                        onClick={() => removeGroup(gi)}
                      >
                        Remove exercise ✕
                      </button>
                    </div>
                  </SwipeToDelete>

                  {/* Grid rows, not a table: on a phone each set wraps onto two lines instead of scrolling sideways. */}
                  <div className="set-grid">
                    <div className="set-grid-head">
                      <span />
                      <span>Set</span>
                      <span>Weight (kg)</span>
                      <span>Reps</span>
                      <span>RPE</span>
                      <span>Type</span>
                      <span />
                    </div>
                    <SortableList ids={g.sets.map((x) => x.id)} onMove={(from, to) => moveSet(gi, from, to)}>
                      {g.sets.map((s, si) => (
                        <SortableItem key={s.id} id={s.id}>
                          {(setHandle) => (
                            <>
                              <SwipeToDelete onDelete={() => removeSet(gi, si)}>
                                <div className={`set-row${s.done ? ' done' : ''}`}>
                                  {setHandle}
                                  <button
                                    type="button"
                                    className={`set-done${s.done ? ' is-done' : ''}`}
                                    aria-pressed={s.done}
                                    onClick={() => updateSet(gi, si, { done: !s.done })}
                                    title={s.done ? 'Done — tap to undo' : 'Tap when you have done this set'}
                                    aria-label={`Set ${si + 1}: ${s.done ? 'done' : 'not done yet'}`}
                                  >
                                    {s.done ? '✓' : si + 1}
                                  </button>
                                  <div className="set-field">
                                    <label className="set-label">kg</label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      min={0}
                                      step={0.5}
                                      value={s.weight}
                                      onChange={(e) => updateSet(gi, si, { weight: decimalInput(e.target.value) })}
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
                                      type="text"
                                      inputMode="decimal"
                                      min={1}
                                      max={10}
                                      step={0.5}
                                      value={s.rpe}
                                      onChange={(e) => updateSet(gi, si, { rpe: decimalInput(e.target.value) })}
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
                                    {s.videoFile ? (
                                      <SavedVideoBadge
                                        note={s.videoNote ?? ''}
                                        onNoteChange={(videoNote) => updateSet(gi, si, { videoNote })}
                                      />
                                    ) : (
                                      <PendingVideoButton
                                        file={s.video}
                                        onChange={(video) => updateSet(gi, si, { video })}
                                        note={s.videoNote ?? ''}
                                        onNoteChange={(videoNote) => updateSet(gi, si, { videoNote })}
                                      />
                                    )}
                                    <button
                                      type="button"
                                      className="ghost small desktop-only"
                                      title="Remove this set"
                                      onClick={() => removeSet(gi, si)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </SwipeToDelete>
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
                            </>
                          )}
                        </SortableItem>
                      ))}
                    </SortableList>
                  </div>

                  <div className="exercise-foot">
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => addSetToGroup(gi)}
                      disabled={!g.exerciseId}
                    >
                      + Add set
                    </button>
                    {g.sets.some((x) => !x.done) && (
                      <button
                        type="button"
                        className="ghost small all-done"
                        onClick={() => markAllDone(gi)}
                      >
                        ✓ All done
                      </button>
                    )}
                  </div>
                </>
              )}
            </SortableItem>
          ))}
        </SortableList>
      </div>

      <div className="row log-foot" style={{ marginTop: '.75rem' }}>
        <button type="button" className="ghost" onClick={addGroup}>
          + Add exercise
        </button>
        {sessionId && (
          <button type="button" onClick={finish} disabled={sync.state === 'saving' || uploading !== undefined}>
            Finish workout
          </button>
        )}
      </div>
      {totalSetCount > 0 && (
        <p className={`sync-status${sync.state === 'error' ? ' failed' : ''}`} role="status">
          <span>
            {doneSetCount} of {totalSetCount} sets done
          </span>
          <span aria-hidden> · </span>
          {sync.state === 'saving' && <span>Saving…</span>}
          {sync.state === 'saved' && <span>Saved to History ✓</span>}
          {sync.state === 'error' && (
            <span>
              Not saved yet ({sync.message}) — retrying.{' '}
              <button type="button" className="link-inline" onClick={() => void runSync()}>
                Retry now
              </button>
            </span>
          )}
          {sync.state === 'idle' && <span className="muted">tick a set to save it</span>}
        </p>
      )}
      {uploading && (
        <div style={{ marginTop: '.5rem' }}>
          <UploadProgress
            fraction={uploading.fraction}
            label={`Uploading video · ${Math.round(uploading.fraction * 100)}% — keep this page open`}
          />
        </div>
      )}
    </form>
  );
}
