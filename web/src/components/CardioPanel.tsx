import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { useAsync } from '../hooks';
import { CARDIO_LABELS, cardioLabel, type CardioActivity, type CardioSession } from '../types';
import {
  formatDay,
  formatDuration,
  paceOrSpeed,
  parseDay,
  relativeDay,
  todayString,
  toDayString,
  weekStart,
} from '../stats';
import { ChartTooltip, StatTile } from './charts';
import { AXIS, GRID, MARGIN } from './chartStyle';
import { SwipeToDelete } from './SwipeToDelete';
import { decimalInput } from '../decimal';

const ACTIVITIES = Object.keys(CARDIO_LABELS) as CardioActivity[];

/** Distance is hidden for HIIT / stairs; your own activities keep it (it's optional). */
const NO_DISTANCE = new Set<string>(['stairs', 'hiit']);
const hasDistance = (activity: string) => !NO_DISTANCE.has(activity);

/** Longest name for your own activity (the API's limit). */
const MAX_ACTIVITY_LENGTH = 40;

interface Form {
  date: string;
  /** A built-in key or your own activity's name. */
  activity: string;
  minutes: string;
  seconds: string;
  distanceKm: string;
  avgHeartRate: string;
  calories: string;
  notes: string;
}

const emptyForm = (): Form => ({
  date: todayString(),
  activity: 'run',
  minutes: '',
  seconds: '',
  distanceKm: '',
  avgHeartRate: '',
  calories: '',
  notes: '',
});

function formFrom(s: CardioSession): Form {
  return {
    date: s.date,
    activity: s.activity,
    minutes: String(Math.floor(s.durationSeconds / 60)),
    seconds: s.durationSeconds % 60 ? String(s.durationSeconds % 60) : '',
    distanceKm: s.distanceKm != null ? String(s.distanceKm) : '',
    avgHeartRate: s.avgHeartRate != null ? String(s.avgHeartRate) : '',
    calories: s.calories != null ? String(s.calories) : '',
    notes: s.notes,
  };
}

/**
 * Your own activities ("Padel"). Kept on the server per person, so they're
 * on all your devices and nobody else ever sees them. Logging one adds it
 * too (the server does that). Removing one only hides its chip — sessions
 * already logged with it keep their name.
 */
function useOwnActivities(userId: string) {
  const loaded = useAsync(() => api.cardioActivities(userId), [userId]);
  const [list, setList] = useState<string[]>();
  const current = list ?? loaded.data ?? [];

  async function save(next: string[]) {
    const before = current;
    setList(next); // show it straight away
    try {
      setList(await api.setCardioActivities(userId, next));
    } catch (err) {
      setList(before);
      throw err;
    }
  }
  return {
    list: current,
    add: (name: string) => save([...current, name]),
    remove: (name: string) => save(current.filter((a) => a !== name)),
  };
}

/** The Cardio section: log a session, see the week at a glance, and every session below. */
export function CardioPanel({ userId }: { userId: string }) {
  const sessions = useAsync(() => api.cardio(userId), [userId]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const [busy, setBusy] = useState(false);
  const list = sessions.data ?? [];
  const own = useOwnActivities(userId);
  const [adding, setAdding] = useState(false);
  const [newActivity, setNewActivity] = useState('');

  /** Built-ins first, then your own (from the log and from "+"), each name once whatever its case. */
  const activities = useMemo(() => {
    const out: string[] = [...ACTIVITIES];
    const seen = new Set(out.map((a) => cardioLabel(a).toLowerCase()));
    // The form's own activity too: editing an old session whose activity was removed from the list.
    for (const a of [...own.list, form.activity]) {
      if (seen.has(cardioLabel(a).toLowerCase())) continue;
      seen.add(cardioLabel(a).toLowerCase());
      out.push(a);
    }
    return out;
  }, [own.list, form.activity]);

  function removeActivity(name: string) {
    setError(undefined);
    // A new entry moves off it; an old session being edited keeps its activity.
    if (form.activity === name && !editingId) set({ activity: 'run' });
    own.remove(name).catch((err: Error) => setError(err.message));
  }

  function addActivity(e?: React.FormEvent | React.KeyboardEvent) {
    e?.preventDefault();
    const name = newActivity.trim().replace(/\s+/g, ' ').slice(0, MAX_ACTIVITY_LENGTH);
    if (!name) return;
    // Typing "run" or "Rowing" picks the built-in one rather than making a twin.
    const existing = activities.find((a) => cardioLabel(a).toLowerCase() === name.toLowerCase() || a === name.toLowerCase());
    if (existing) set({ activity: existing });
    else {
      own.add(name).catch((err: Error) => setError(err.message));
      set({ activity: name });
    }
    setNewActivity('');
    setAdding(false);
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setOk(undefined);
    const durationSeconds = Math.round((Number(form.minutes) || 0) * 60 + (Number(form.seconds) || 0));
    if (durationSeconds <= 0) {
      setError('How long was it? Fill in the minutes.');
      return;
    }
    const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
    setBusy(true);
    try {
      await api.saveCardio(
        userId,
        {
          date: form.date,
          activity: form.activity,
          durationSeconds,
          distanceKm: hasDistance(form.activity) ? num(form.distanceKm) : null,
          avgHeartRate: num(form.avgHeartRate),
          calories: num(form.calories),
          notes: form.notes,
        },
        editingId,
      );
      setOk(editingId ? 'Saved.' : 'Cardio logged.');
      setForm({ ...emptyForm(), activity: form.activity });
      setEditingId(undefined);
      sessions.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api.deleteCardio(userId, id).catch((err: Error) => setError(err.message));
    if (editingId === id) {
      setEditingId(undefined);
      setForm(emptyForm());
    }
    sessions.reload();
  }

  return (
    <>
      <form className="panel" onSubmit={save}>
        <div className="panel-head">
          <h2>{editingId ? 'Edit cardio' : 'Log cardio'}</h2>
          {editingId && (
            <button
              type="button"
              className="ghost small"
              onClick={() => {
                setEditingId(undefined);
                setForm(emptyForm());
              }}
            >
              ✕ Close
            </button>
          )}
        </div>
        {error && <div className="err">{error}</div>}
        {ok && <p className="pr">{ok}</p>}

        <div className="chips cardio-activities">
          {activities.map((a) =>
            own.list.includes(a) ? (
              // Your own activity: tap to pick it, ✕ to take it off your list.
              <span key={a} className={`chip chip-own${form.activity === a ? ' active' : ''}`}>
                <button type="button" className="chip-pick" onClick={() => set({ activity: a })}>
                  {a}
                </button>
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => removeActivity(a)}
                  title={`Remove ${a} from your list — sessions you've logged keep it`}
                  aria-label={`Remove ${a}`}
                >
                  ✕
                </button>
              </span>
            ) : (
              <button
                key={a}
                type="button"
                className={`chip${form.activity === a ? ' active' : ''}`}
                onClick={() => set({ activity: a })}
              >
                {cardioLabel(a)}
              </button>
            ),
          )}
          {adding ? (
            <span className="chip-add">
              <input
                autoFocus
                value={newActivity}
                maxLength={MAX_ACTIVITY_LENGTH}
                onChange={(e) => setNewActivity(e.target.value)}
                onKeyDown={(e) => {
                  // Enter adds the activity instead of submitting the whole cardio form.
                  if (e.key === 'Enter') addActivity(e);
                  if (e.key === 'Escape') setAdding(false);
                }}
                placeholder="e.g. Padel"
                aria-label="Your own activity"
              />
              <button type="button" className="small" onClick={() => addActivity()} disabled={!newActivity.trim()}>
                Add
              </button>
              <button type="button" className="ghost small" onClick={() => setAdding(false)} aria-label="Cancel">
                ✕
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="chip chip-plus"
              onClick={() => setAdding(true)}
              title="Add your own activity"
              aria-label="Add your own activity"
            >
              +
            </button>
          )}
        </div>

        <div className="cardio-grid">
          <div>
            <label>Date</label>
            <input type="date" value={form.date} max={todayString()} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div>
            <label>Minutes</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.minutes}
              onChange={(e) => set({ minutes: e.target.value })}
              placeholder="30"
            />
          </div>
          <div>
            <label>Seconds</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={form.seconds}
              onChange={(e) => set({ seconds: e.target.value })}
              placeholder="0"
            />
          </div>
          {hasDistance(form.activity) && (
            <div>
              <label>Distance (km)</label>
              <input
                type="text"
                inputMode="decimal"
                min={0}
                step={0.01}
                value={form.distanceKm}
                onChange={(e) => set({ distanceKm: decimalInput(e.target.value) })}
                placeholder="optional"
              />
            </div>
          )}
          <div>
            <label>Avg heart rate</label>
            <input
              type="number"
              inputMode="numeric"
              min={30}
              max={250}
              value={form.avgHeartRate}
              onChange={(e) => set({ avgHeartRate: e.target.value })}
              placeholder="optional"
            />
          </div>
          <div>
            <label>Calories</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.calories}
              onChange={(e) => set({ calories: e.target.value })}
              placeholder="optional"
            />
          </div>
        </div>
        <div className="field" style={{ marginTop: '.6rem' }}>
          <label>Notes</label>
          <input value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="how did it feel?" />
        </div>
        <button disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Saving…' : editingId ? 'Save changes' : 'Log cardio'}
        </button>
      </form>

      <CardioSummary sessions={list} />

      <div className="panel">
        <h2>
          Your cardio{' '}
          <span className="muted" style={{ fontWeight: 400 }}>
            · {list.length}
          </span>
        </h2>
        {sessions.error && <div className="err">{sessions.error}</div>}
        {list.length === 0 && <p className="muted">Nothing logged yet.</p>}
        <div className="cardio-list">
          {list.map((s) => {
            const pace = paceOrSpeed(s.activity, s.durationSeconds, s.distanceKm);
            return (
              <SwipeToDelete key={s.id} onDelete={() => remove(s.id)} onPanel>
                <div className={`cardio-row${editingId === s.id ? ' selected' : ''}`}>
                  <button
                    type="button"
                    className="cardio-main"
                    onClick={() => {
                      setEditingId(s.id);
                      setForm(formFrom(s));
                      setOk(undefined);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    title="Tap to edit"
                  >
                    <strong>
                      {cardioLabel(s.activity)} · {formatDuration(s.durationSeconds)}
                      {s.distanceKm != null && ` · ${s.distanceKm} km`}
                    </strong>
                    <span className="muted">
                      {formatDay(s.date)} · {relativeDay(s.date)}
                      {pace && ` · ${pace}`}
                      {s.avgHeartRate != null && ` · ${s.avgHeartRate} bpm`}
                      {s.calories != null && ` · ${s.calories} kcal`}
                    </span>
                    {s.notes && <span className="muted cardio-notes">“{s.notes}”</span>}
                  </button>
                  <button
                    type="button"
                    className="ghost small desktop-only"
                    onClick={() => remove(s.id)}
                    aria-label="Delete"
                  >
                    ✕
                  </button>
                </div>
              </SwipeToDelete>
            );
          })}
        </div>
      </div>
    </>
  );
}

interface CardioWeek {
  label: string;
  minutes: number;
  km: number;
  sessions: number;
}

function CardioSummary({ sessions }: { sessions: CardioSession[] }) {
  const weeks = useMemo(() => {
    const thisWeek = weekStart(new Date());
    const buckets = new Map<number, CardioWeek>();
    const out: CardioWeek[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisWeek);
      d.setDate(d.getDate() - i * 7);
      const b = { label: formatDay(toDayString(d)).split(' ').slice(1).join(' '), minutes: 0, km: 0, sessions: 0 };
      buckets.set(d.getTime(), b);
      out.push(b);
    }
    for (const s of sessions) {
      const b = buckets.get(weekStart(parseDay(s.date)).getTime());
      if (!b) continue;
      b.minutes += s.durationSeconds / 60;
      b.km += s.distanceKm ?? 0;
      b.sessions += 1;
    }
    for (const b of out) {
      b.minutes = Math.round(b.minutes);
      b.km = Math.round(b.km * 100) / 100;
    }
    return out;
  }, [sessions]);

  if (sessions.length === 0) return null;
  const now = weeks[weeks.length - 1];
  const last4 = weeks.slice(-4);

  return (
    <>
      <div className="stat-grid">
        <StatTile label="This week" value={String(now.minutes)} unit="min" sub={`${now.sessions} session${now.sessions === 1 ? '' : 's'}`} />
        <StatTile label="Distance this week" value={now.km.toFixed(2)} unit="km" />
        <StatTile
          label="Last 4 weeks"
          value={String(last4.reduce((v, w) => v + w.minutes, 0))}
          unit="min"
          sub={`${last4.reduce((v, w) => v + w.km, 0).toFixed(2)} km`}
        />
      </div>
      <div className="panel">
        <h2>Minutes per week</h2>
        <p className="muted chart-sub">Last 12 weeks</p>
        <div className="chart-box">
          <ResponsiveContainer>
            <BarChart data={weeks} margin={MARGIN}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" {...AXIS} minTickGap={8} />
              <YAxis {...AXIS} width={36} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'var(--panel-2)' }}
                content={(props) => (
                  <ChartTooltip<CardioWeek>
                    {...props}
                    title={(d) => `Week of ${d.label}`}
                    rows={(d) => [
                      { label: 'Time', value: `${d.minutes} min` },
                      { label: 'Distance', value: `${d.km.toFixed(2)} km` },
                      { label: 'Sessions', value: String(d.sessions) },
                    ]}
                  />
                )}
              />
              <Bar dataKey="minutes" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
