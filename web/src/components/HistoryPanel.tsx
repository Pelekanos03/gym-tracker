import { useMemo, useState } from 'react';
import type { WorkoutSession } from '../types';
import { compact, completed, parseDay, sessionVolume, toDayString, todayString } from '../stats';
import { SessionList } from './SessionList';

const MONTH = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The History tab: a month calendar of training days on top (tap a day to
 * jump to it), a filter by exercise, then every session as a card.
 */
export function HistoryPanel({
  sessions,
  userId,
  onChanged,
  onDelete,
  activeSessionId,
  onContinue,
}: {
  sessions: WorkoutSession[];
  userId: string;
  onChanged: () => void;
  onDelete: (id: string) => Promise<void>;
  /** The session the Workout form is saving into right now. */
  activeSessionId?: string;
  /** Load a session back into the Workout form to carry on with it. */
  onContinue: (session: WorkoutSession) => void;
}) {
  const [query, setQuery] = useState('');
  const [day, setDay] = useState<string>();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter(
      (s) =>
        (!day || s.date.slice(0, 10) === day) &&
        (!q ||
          s.notes.toLowerCase().includes(q) ||
          s.sets.some(
            (set) =>
              set.exercise.name.toLowerCase().includes(q) ||
              set.exercise.primaryMuscle.toLowerCase().includes(q),
          )),
    );
  }, [sessions, query, day]);

  return (
    <>
      <div className="panel">
        <TrainingCalendar sessions={sessions} selected={day} onSelect={setDay} />
      </div>

      <div className="panel">
        <div className="history-head">
          <h2>
            {day ? `Sessions on ${day}` : 'All sessions'}{' '}
            <span className="muted" style={{ fontWeight: 400 }}>
              · {filtered.length}
            </span>
          </h2>
          {day && (
            <button className="ghost small" onClick={() => setDay(undefined)}>
              Show all
            </button>
          )}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by exercise, body part or note…"
          style={{ marginBottom: '.75rem' }}
        />
        <SessionList
          // Remount when the filter changes so the newest match opens.
          key={`${day}|${query}`}
          sessions={filtered}
          userId={userId}
          onChanged={onChanged}
          onDelete={onDelete}
          activeSessionId={activeSessionId}
          onContinue={onContinue}
        />
      </div>
    </>
  );
}

function TrainingCalendar({
  sessions,
  selected,
  onSelect,
}: {
  sessions: WorkoutSession[];
  selected?: string;
  onSelect: (day: string | undefined) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of completed(sessions)) {
      const key = s.date.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + sessionVolume(s));
    }
    return map;
  }, [sessions]);

  const cells = useMemo(() => {
    const first = new Date(month);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(toDayString(new Date(month.getFullYear(), month.getMonth(), d)));
    }
    return out;
  }, [month]);

  const monthDays = cells.filter((c): c is string => !!c && byDay.has(c));
  const monthVolume = monthDays.reduce((sum, d) => sum + (byDay.get(d) ?? 0), 0);
  const today = todayString();

  function shift(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button className="ghost small" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <div style={{ textAlign: 'center' }}>
          <strong>{MONTH.format(month)}</strong>
          <div className="muted" style={{ fontSize: '.8rem' }}>
            {monthDays.length} training day{monthDays.length === 1 ? '' : 's'}
            {monthVolume > 0 && ` · ${compact(monthVolume)} kg`}
          </div>
        </div>
        <button className="ghost small" onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="calendar-weekday">
            {w}
          </span>
        ))}
        {cells.map((c, i) =>
          c === null ? (
            <span key={i} />
          ) : (
            <button
              key={c}
              type="button"
              disabled={!byDay.has(c)}
              className={[
                'calendar-day',
                byDay.has(c) && 'trained',
                c === today && 'today',
                c === selected && 'selected',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(c === selected ? undefined : c)}
              title={byDay.has(c) ? `${compact(byDay.get(c)!)} kg` : undefined}
            >
              {parseDay(c).getDate()}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
