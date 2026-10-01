import { useState } from 'react';
import type { SetLog, WorkoutSession } from '../types';
import { SET_TYPE_LABELS } from '../types';
import {
  compact,
  formatDay,
  groupByExercise,
  relativeDay,
  sessionVolume,
  topSetLabel,
} from '../stats';
import { SessionEditor } from './SessionEditor';
import { SetVideoButton } from './SetVideo';

/** Drops / superset partners in the order they were done (the API doesn't guarantee it). */
function byOrder<T extends { orderIndex: number }>(items: T[] | undefined): T[] {
  return [...(items ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * Logged sessions as cards: date, headline numbers and a one-line summary
 * per exercise are always visible; tap a card to see every set (and its
 * video). With `userId`, the viewer is the lifter and may edit, delete and
 * attach videos; without it (a coach looking at a client) it's read-only.
 */
export function SessionList({
  sessions,
  userId,
  onDelete,
  onChanged,
  initiallyOpen = 1,
}: {
  sessions: WorkoutSession[];
  userId?: string;
  onDelete?: (id: string) => Promise<void>;
  onChanged?: () => void;
  /** How many of the newest sessions start expanded. */
  initiallyOpen?: number;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(sessions.slice(0, initiallyOpen).map((s) => s.id)),
  );

  if (sessions.length === 0) {
    return <p className="muted">No sessions logged yet.</p>;
  }

  function toggle(id: string) {
    setOpenIds((ids) => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="session-list">
      {sessions.map((s) => (
        <SessionCard
          key={s.id}
          session={s}
          open={openIds.has(s.id)}
          onToggle={() => toggle(s.id)}
          userId={userId}
          onDelete={onDelete}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

function SessionCard({
  session: s,
  open,
  onToggle,
  userId,
  onDelete,
  onChanged,
}: {
  session: WorkoutSession;
  open: boolean;
  onToggle: () => void;
  userId?: string;
  onDelete?: (id: string) => Promise<void>;
  onChanged?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const groups = groupByExercise(s.sets);
  const workingSets = s.sets.filter((x) => x.setType !== 'WARMUP').length;
  const videos = s.sets.filter((x) => x.videoFile).length;

  return (
    <article className={`session-card${open ? ' open' : ''}`}>
      <button type="button" className="session-head" onClick={onToggle} aria-expanded={open}>
        <div className="session-date">
          <strong>{formatDay(s.date)}</strong>
          <span className="muted">{relativeDay(s.date)}</span>
        </div>
        <div className="session-metrics">
          <span>
            <strong>{groups.length}</strong> <span className="muted">exercises</span>
          </span>
          <span>
            <strong>{workingSets}</strong> <span className="muted">sets</span>
          </span>
          <span>
            <strong>{compact(sessionVolume(s))}</strong> <span className="muted">kg</span>
          </span>
          {videos > 0 && (
            <span>
              <strong>{videos}</strong> <span className="muted">{videos === 1 ? 'video' : 'videos'}</span>
            </span>
          )}
        </div>
        <span className="session-chevron" aria-hidden>
          ▾
        </span>
      </button>

      {s.status !== 'COMPLETED' && <span className="tag">{s.status.toLowerCase()}</span>}
      {s.programDay && (
        <span className="muted session-plan">{s.programDay.name}</span>
      )}
      {s.notes && <p className="session-notes">“{s.notes}”</p>}

      {!open && (
        <ul className="session-summary">
          {groups.map((g, i) => (
            <li key={i}>
              <span>{g.name}</span>
              <span className="muted">
                {g.sets.length} × · top {topSetLabel(g.sets)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <>
          {groups.map((g, gi) => (
            <div key={gi} className="exercise-block">
              <h4>{g.name}</h4>
              {g.sets.map((set, si) => (
                <SetLine
                  key={set.id}
                  set={set}
                  n={si + 1}
                  userId={userId}
                  onChanged={onChanged}
                />
              ))}
            </div>
          ))}

          {(userId || onDelete) && (
            <div className="row session-actions">
              {confirming ? (
                <>
                  <span className="muted">Delete this session for good?</span>
                  <button
                    className="small"
                    onClick={() => {
                      onDelete?.(s.id);
                      setConfirming(false);
                    }}
                  >
                    Confirm delete
                  </button>
                  <button className="ghost small" onClick={() => setConfirming(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {userId && (
                    <button className="ghost small" onClick={() => setEditing((e) => !e)}>
                      {editing ? 'Close editor' : 'Edit'}
                    </button>
                  )}
                  {onDelete && (
                    <button className="ghost small" onClick={() => setConfirming(true)}>
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {editing && userId && (
            <SessionEditor
              session={s}
              userId={userId}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                onChanged?.();
              }}
            />
          )}
        </>
      )}
    </article>
  );
}

function SetLine({
  set,
  n,
  userId,
  onChanged,
}: {
  set: SetLog;
  n: number;
  userId?: string;
  onChanged?: () => void;
}) {
  return (
    <>
      <div className={`set-line${set.setType === 'WARMUP' ? ' warmup' : ''}`}>
        <span className="set-n">{n}</span>
        <span className="set-main">
          <strong>{set.weight > 0 ? `${set.weight} kg` : 'BW'}</strong> × {set.reps}
          {set.rpe != null && <span className="muted"> @ RPE {set.rpe}</span>}
          {set.setType !== 'WORKING' && (
            <span className="set-type"> {SET_TYPE_LABELS[set.setType].toLowerCase()}</span>
          )}
        </span>
        {(set.videoFile || userId) && (
          <SetVideoButton
            setId={set.id}
            videoFile={set.videoFile}
            userId={userId}
            onChanged={onChanged}
          />
        )}
      </div>
      {byOrder(set.drops).map((d) => (
        <div key={d.id} className="set-line sub muted">
          ↳ drop {d.orderIndex}: {d.weight} kg × {d.reps}
        </div>
      ))}
      {byOrder(set.supersetPartners).map((p) => (
        <div key={p.id} className="set-line sub muted">
          ↳ + {p.exercise.name}: {p.weight} kg × {p.reps}
        </div>
      ))}
    </>
  );
}
