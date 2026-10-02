import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';
import type { BodyWeightEntry, WeightReminder } from '../types';
import { WeightReminderSetting } from './WeightReminder';
import { formatDay, formatShortDay, kg2, parseDay, toDayString, todayString } from '../stats';
import { ChartTooltip } from './charts';
import { AXIS, GRID, MARGIN } from './chartStyle';
import { SwipeToDelete } from './SwipeToDelete';
import { decimalInput } from '../decimal';

const RANGES = [
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 91 },
  { id: '6m', label: '6M', days: 182 },
  { id: '1y', label: '1Y', days: 365 },
  { id: 'all', label: 'All', days: Infinity },
] as const;
type Range = (typeof RANGES)[number]['id'];

/** Trend = the average of every reading in the 7 days up to and including that one. */
const TREND_DAYS = 7;
const DAY_MS = 86_400_000;

interface Point {
  /** Midnight of the reading's day (ms) — a time axis, so gaps between weigh-ins show as gaps. */
  t: number;
  date: string;
  weight: number;
  trend: number;
}

function toPoints(entries: BodyWeightEntry[]): Point[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((e, i) => {
    const t = parseDay(e.date).getTime();
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0; j--) {
      if (t - parseDay(sorted[j].date).getTime() >= TREND_DAYS * DAY_MS) break;
      sum += sorted[j].weight;
      n++;
    }
    return { t, date: e.date, weight: e.weight, trend: Math.round((sum / n) * 100) / 100 };
  });
}

/**
 * Log today's (or any day's) body weight, see the trend, and fix mistakes.
 * One reading per day — logging the same day again overwrites it.
 */
export function BodyWeightPanel({
  userId,
  entries,
  onChanged,
  reminder,
  onReminderChange,
}: {
  userId: string;
  entries: BodyWeightEntry[];
  onChanged: () => void;
  reminder: WeightReminder;
  onReminderChange: (value: WeightReminder) => void;
}) {
  const latest = entries[entries.length - 1];
  const [date, setDate] = useState(todayString);
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [range, setRange] = useState<Range>('3m');

  const allPoints = useMemo(() => toPoints(entries), [entries]);
  const points = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)!.days;
    if (!Number.isFinite(days)) return allPoints;
    const from = parseDay(todayString()).getTime() - days * DAY_MS;
    return allPoints.filter((p) => p.t >= from);
  }, [allPoints, range]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const value = Math.round(Number(weight.replace(',', '.')) * 100) / 100;
    if (!value || value < 20 || value > 400) {
      setError('Enter a body weight in kg (20–400).');
      return;
    }
    setBusy(true);
    try {
      await api.logBodyWeight(userId, { date, weight: value });
      setWeight('');
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteBodyWeight(userId, id);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const monthAgo = parseDay(todayString());
  monthAgo.setDate(monthAgo.getDate() - 30);
  const baseline = [...entries].reverse().find((e) => parseDay(e.date) <= monthAgo) ?? entries[0];
  const change = latest && baseline && latest.id !== baseline.id ? latest.weight - baseline.weight : null;
  const recent = [...entries].reverse().slice(0, showAll ? undefined : 5);

  return (
    <>
      <form onSubmit={save} className="row" style={{ alignItems: 'flex-end' }}>
        <div>
          <label>Date</label>
          <input type="date" value={date} max={todayString()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label>Weight (kg)</label>
          <input
            type="text"
            inputMode="decimal"
            step={0.01}
            min={20}
            max={400}
            value={weight}
            onChange={(e) => setWeight(decimalInput(e.target.value))}
            placeholder={latest ? kg2(latest.weight) : 'e.g. 80.25'}
          />
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <button disabled={busy}>Save</button>
        </div>
      </form>
      {error && <div className="err" style={{ marginTop: '.5rem' }}>{error}</div>}
      <WeightReminderSetting value={reminder} onChange={onReminderChange} />

      {entries.length === 0 ? (
        <p className="muted" style={{ marginTop: '.75rem' }}>
          No readings yet — log one above and the trend shows up here.
        </p>
      ) : (
        <>
          <div className="chart-caption" style={{ marginTop: '1rem' }}>
            <div>
              <div className="stat-label">Latest · {formatShortDay(latest.date)}</div>
              <div className="stat-value">
                {kg2(latest.weight)} <span className="stat-unit">kg</span>
              </div>
            </div>
            {change !== null && (
              <div className="stat-delta">
                {change > 0 ? '▲' : change < 0 ? '▼' : '='} {kg2(Math.abs(change))} kg
                since {formatShortDay(baseline.date)}
              </div>
            )}
          </div>

          <div className="bw-chart-head">
            <div className="chart-legend" aria-hidden>
              <span>
                <i className="legend-dot" /> Daily
              </span>
              <span>
                <i className="legend-line" /> {TREND_DAYS}-day trend
              </span>
            </div>
            <div className="segmented" role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={range === r.id ? 'active' : ''}
                  aria-pressed={range === r.id}
                  onClick={() => setRange(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {points.length === 0 ? (
            <p className="muted">No readings in this period — pick a longer range.</p>
          ) : (
            <div className="chart-box" style={{ height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={points} margin={MARGIN}>
                  <CartesianGrid {...GRID} />
                  <XAxis
                    dataKey="t"
                    type="number"
                    scale="time"
                    // One reading still gets a sensible axis: a day either side.
                    domain={points.length > 1 ? ['dataMin', 'dataMax'] : [points[0].t - DAY_MS, points[0].t + DAY_MS]}
                    {...AXIS}
                    tickFormatter={(t: number) => formatShortDay(toDayString(new Date(t)))}
                    minTickGap={24}
                  />
                  <YAxis
                    {...AXIS}
                    width={40}
                    axisLine={false}
                    domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
                    content={(props) => (
                      <ChartTooltip<Point>
                        {...props}
                        title={(d) => formatDay(d.date)}
                        rows={(d) => [
                          { label: 'Weighed', value: `${kg2(d.weight)} kg` },
                          { label: `${TREND_DAYS}-day trend`, value: `${kg2(d.trend)} kg` },
                        ]}
                      />
                    )}
                  />
                  {/* Daily readings: dots only — day-to-day water swings are noise next to the trend. */}
                  <Line
                    dataKey="weight"
                    stroke="none"
                    isAnimationActive={false}
                    dot={{ r: 4, fill: 'var(--muted)', stroke: 'var(--panel)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: 'var(--muted)', stroke: 'var(--panel)', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="trend"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={points.length === 1 ? { r: 4, fill: 'var(--accent)', stroke: 'var(--panel)', strokeWidth: 2 } : false}
                    activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--panel)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bw-list">
            {recent.map((e) => (
              <SwipeToDelete key={e.id} onDelete={() => remove(e.id)} onPanel>
                <div className="bw-row">
                  <span>{formatDay(e.date)}</span>
                  <strong>{kg2(e.weight)} kg</strong>
                  <button
                    type="button"
                    className="ghost small desktop-only"
                    onClick={() => remove(e.id)}
                    aria-label={`Delete reading from ${e.date}`}
                  >
                    ✕
                  </button>
                </div>
              </SwipeToDelete>
            ))}
          </div>
          {entries.length > 5 && (
            <button type="button" className="ghost small" onClick={() => setShowAll((s) => !s)}>
              {showAll ? 'Show fewer' : `Show all ${entries.length}`}
            </button>
          )}
        </>
      )}
    </>
  );
}
