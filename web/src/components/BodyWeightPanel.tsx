import { useState } from 'react';
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
import type { BodyWeightEntry } from '../types';
import { formatDay, formatShortDay, parseDay, todayString } from '../stats';
import { ChartTooltip } from './charts';
import { AXIS, GRID, MARGIN } from './chartStyle';

/**
 * Log today's (or any day's) body weight, see the trend, and fix mistakes.
 * One reading per day — logging the same day again overwrites it.
 */
export function BodyWeightPanel({
  userId,
  entries,
  onChanged,
}: {
  userId: string;
  entries: BodyWeightEntry[];
  onChanged: () => void;
}) {
  const latest = entries[entries.length - 1];
  const [date, setDate] = useState(todayString);
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const value = Number(weight.replace(',', '.'));
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
            type="number"
            inputMode="decimal"
            step={0.1}
            min={20}
            max={400}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={latest ? String(latest.weight) : 'e.g. 80.5'}
          />
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <button disabled={busy}>Save</button>
        </div>
      </form>
      {error && <div className="err" style={{ marginTop: '.5rem' }}>{error}</div>}

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
                {latest.weight} <span className="stat-unit">kg</span>
              </div>
            </div>
            {change !== null && (
              <div className="stat-delta">
                {change > 0 ? '▲' : change < 0 ? '▼' : '='} {Math.abs(Math.round(change * 10) / 10)} kg
                since {formatShortDay(baseline.date)}
              </div>
            )}
          </div>

          {entries.length > 1 && (
            <div className="chart-box" style={{ height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={entries} margin={MARGIN}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" {...AXIS} tickFormatter={formatShortDay} minTickGap={24} />
                  <YAxis
                    {...AXIS}
                    width={40}
                    axisLine={false}
                    domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
                    content={(props) => (
                      <ChartTooltip<BodyWeightEntry>
                        {...props}
                        title={(d) => formatDay(d.date)}
                        rows={(d) => [{ label: 'Body weight', value: `${d.weight} kg` }]}
                      />
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--panel)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: 'var(--accent)', stroke: 'var(--panel)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bw-list">
            {recent.map((e) => (
              <div key={e.id} className="bw-row">
                <span>{formatDay(e.date)}</span>
                <strong>{e.weight} kg</strong>
                <button
                  type="button"
                  className="ghost small"
                  onClick={() => remove(e.id)}
                  aria-label={`Delete reading from ${e.date}`}
                >
                  ✕
                </button>
              </div>
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
