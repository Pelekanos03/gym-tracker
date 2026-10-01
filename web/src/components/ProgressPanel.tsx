import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ExerciseProgress, ProgressPoint } from '../types';
import { formatDay, formatShortDay } from '../stats';
import { ChartTooltip } from './charts';
import { AXIS, GRID, MARGIN } from './chartStyle';

/**
 * Estimated-1RM trend for one exercise at a time (pick it from the chips
 * or click a row), with the all-time best marked, plus a personal-records
 * table of every exercise.
 */
export function ProgressPanel({ data }: { data: ExerciseProgress[] }) {
  const [selectedId, setSelectedId] = useState<string>('');

  if (data.length === 0) {
    return <p className="muted">No progress data yet — log some working sets.</p>;
  }

  // Most-trained first: those are the lifts people care about seeing.
  const ranked = [...data].sort((a, b) => b.points.length - a.points.length);
  const selected = data.find((d) => d.exerciseId === selectedId) ?? ranked[0];
  const values = selected.points.map((p) => p.bestEstimatedOneRepMax);
  const first = values[0] ?? 0;
  const latest = values[values.length - 1] ?? 0;
  const change = latest - first;

  return (
    <>
      <div className="chips scroll-x" style={{ marginBottom: '.75rem' }}>
        {ranked.map((d) => (
          <button
            key={d.exerciseId}
            type="button"
            className={`chip${d.exerciseId === selected.exerciseId ? ' active' : ''}`}
            onClick={() => setSelectedId(d.exerciseId)}
          >
            {d.exerciseName}
          </button>
        ))}
      </div>

      <div className="chart-caption">
        <div>
          <div className="stat-label">{selected.exerciseName} · estimated 1RM</div>
          <div className="stat-value">
            {latest} <span className="stat-unit">kg</span>
          </div>
        </div>
        {values.length > 1 && (
          <div className={`stat-delta ${change > 0 ? 'up' : change < 0 ? 'down' : ''}`}>
            {change > 0 ? '▲' : change < 0 ? '▼' : '='} {Math.abs(Math.round(change * 10) / 10)} kg
            since {formatShortDay(selected.points[0].date)}
          </div>
        )}
      </div>

      <div className="chart-box">
        <ResponsiveContainer>
          <AreaChart data={selected.points} margin={MARGIN}>
            <defs>
              <linearGradient id="e1rmWash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...AXIS} tickFormatter={formatShortDay} minTickGap={24} />
            <YAxis
              {...AXIS}
              width={40}
              domain={[(min: number) => Math.floor(min * 0.95), 'auto']}
              axisLine={false}
            />
            <ReferenceLine
              y={selected.allTimeBestE1rm}
              stroke="var(--muted)"
              strokeDasharray="2 4"
              label={{
                value: `best ${selected.allTimeBestE1rm}`,
                position: 'insideTopLeft',
                fill: 'var(--muted)',
                fontSize: 11,
              }}
            />
            <Tooltip
              cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
              content={(props) => (
                <ChartTooltip<ProgressPoint>
                  {...props}
                  title={(d) => formatDay(d.date)}
                  rows={(d) => [
                    { label: 'Est. 1RM', value: `${d.bestEstimatedOneRepMax} kg` },
                    {
                      label: 'Top set',
                      value: `${d.topSet.weight} kg × ${d.topSet.reps}${d.topSet.rpe ? ` @${d.topSet.rpe}` : ''}`,
                    },
                  ]}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="bestEstimatedOneRepMax"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#e1rmWash)"
              dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--panel)', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: 'var(--accent)', stroke: 'var(--panel)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <h3 style={{ marginTop: '1.25rem' }}>Personal records</h3>
      <div className="pr-list">
        {ranked.map((row) => {
          const vals = row.points.map((p) => p.bestEstimatedOneRepMax);
          const last = vals[vals.length - 1] ?? 0;
          const isPr = vals.length > 0 && last >= row.allTimeBestE1rm;
          const bestPoint = row.points.find((p) => p.bestEstimatedOneRepMax === row.allTimeBestE1rm);
          return (
            <button
              key={row.exerciseId}
              type="button"
              className={`pr-row${row.exerciseId === selected.exerciseId ? ' selected' : ''}`}
              onClick={() => setSelectedId(row.exerciseId)}
            >
              <span className="pr-name">
                {row.exerciseName}
                {isPr && <span className="pr"> · PR</span>}
              </span>
              <span className="pr-best">
                <strong>~{row.allTimeBestE1rm} kg</strong>
                {bestPoint && (
                  <span className="muted">
                    {bestPoint.topSet.weight}×{bestPoint.topSet.reps} · {formatShortDay(bestPoint.date)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
