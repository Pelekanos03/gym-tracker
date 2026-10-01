import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BodyWeightEntry, ExerciseProgress, WorkoutSession } from '../types';
import {
  compact,
  completed,
  parseDay,
  sessionVolume,
  setsByMuscle,
  todayString,
  weekStart,
  weekStreak,
  weeklyBuckets,
  type WeekBucket,
} from '../stats';
import { ChartTooltip, StatTile } from './charts';
import { AXIS, GRID, MARGIN } from './chartStyle';
import { ProgressPanel } from './ProgressPanel';
import { BodyWeightPanel } from './BodyWeightPanel';

type WeekMetric = 'volume' | 'sessions' | 'sets';

const WEEK_METRICS: Record<WeekMetric, { label: string; unit: string }> = {
  volume: { label: 'Volume', unit: 'kg' },
  sessions: { label: 'Workouts', unit: '' },
  sets: { label: 'Hard sets', unit: '' },
};

/** The Stats tab: headline tiles, then weekly training, body parts, strength and body weight. */
export function StatsPanel({
  userId,
  sessions,
  progress,
  bodyWeight,
  onBodyWeightChanged,
}: {
  userId: string;
  sessions: WorkoutSession[];
  progress: ExerciseProgress[];
  bodyWeight: BodyWeightEntry[];
  onBodyWeightChanged: () => void;
}) {
  const [metric, setMetric] = useState<WeekMetric>('volume');
  const [muscleDays, setMuscleDays] = useState(30);

  const done = useMemo(() => completed(sessions), [sessions]);
  const weeks = useMemo(() => weeklyBuckets(sessions, 12), [sessions]);
  const muscles = useMemo(() => setsByMuscle(sessions, muscleDays), [sessions, muscleDays]);

  const tiles = useMemo(() => {
    const today = parseDay(todayString());
    const daysAgo = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d;
    };
    const inRange = (from: Date, to: Date) =>
      done.filter((s) => {
        const d = parseDay(s.date);
        return d > from && d <= to;
      });
    const last30 = inRange(daysAgo(30), today);
    const prev30 = inRange(daysAgo(60), daysAgo(30));
    const vol30 = last30.reduce((v, s) => v + sessionVolume(s), 0);
    const volPrev = prev30.reduce((v, s) => v + sessionVolume(s), 0);
    const thisWeek = done.filter(
      (s) => weekStart(parseDay(s.date)).getTime() === weekStart(today).getTime(),
    ).length;
    const prs = progress.filter((p) => {
      const last = p.points[p.points.length - 1];
      return p.points.length > 1 && last && last.bestEstimatedOneRepMax >= p.allTimeBestE1rm;
    }).length;
    return { vol30, volPrev, thisWeek, streak: weekStreak(sessions), prs, last30: last30.length };
  }, [done, sessions, progress]);

  const volDelta =
    tiles.volPrev > 0 ? Math.round(((tiles.vol30 - tiles.volPrev) / tiles.volPrev) * 100) : null;
  const latestBw = bodyWeight[bodyWeight.length - 1];

  return (
    <>
      <div className="stat-grid">
        <StatTile
          label="Workouts"
          value={String(done.length)}
          sub={`${tiles.last30} in the last 30 days`}
        />
        <StatTile label="This week" value={String(tiles.thisWeek)} sub="sessions since Monday" />
        <StatTile
          label="Streak"
          value={String(tiles.streak)}
          unit={tiles.streak === 1 ? 'week' : 'weeks'}
          sub="in a row with a workout"
        />
        <StatTile
          label="Volume · 30 days"
          value={compact(tiles.vol30)}
          unit="kg"
          delta={
            volDelta === null
              ? undefined
              : {
                  text: `${volDelta >= 0 ? '▲' : '▼'} ${Math.abs(volDelta)}% vs previous 30`,
                  good: volDelta >= 0,
                }
          }
        />
        <StatTile
          label="At a PR now"
          value={String(tiles.prs)}
          unit={tiles.prs === 1 ? 'lift' : 'lifts'}
          sub="latest session is your best"
        />
        <StatTile
          label="Body weight"
          value={latestBw ? String(latestBw.weight) : '—'}
          unit={latestBw ? 'kg' : undefined}
          sub={latestBw ? undefined : 'log it below'}
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Weekly training</h2>
          <div className="segmented">
            {(Object.keys(WEEK_METRICS) as WeekMetric[]).map((m) => (
              <button
                key={m}
                type="button"
                className={metric === m ? 'active' : ''}
                onClick={() => setMetric(m)}
              >
                {WEEK_METRICS[m].label}
              </button>
            ))}
          </div>
        </div>
        <p className="muted chart-sub">Last 12 weeks · warm-ups excluded</p>
        <div className="chart-box">
          <ResponsiveContainer>
            <BarChart data={weeks} margin={MARGIN}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" {...AXIS} minTickGap={8} />
              <YAxis
                {...AXIS}
                width={40}
                axisLine={false}
                allowDecimals={false}
                tickFormatter={(v: number) => compact(v)}
              />
              <Tooltip
                cursor={{ fill: 'var(--panel-2)' }}
                content={(props) => (
                  <ChartTooltip<WeekBucket>
                    {...props}
                    title={(d) => `Week of ${d.label}`}
                    rows={(d) => [
                      { label: 'Volume', value: `${d.volume.toLocaleString()} kg` },
                      { label: 'Workouts', value: String(d.sessions) },
                      { label: 'Hard sets', value: String(d.sets) },
                    ]}
                  />
                )}
              />
              <Bar dataKey={metric} fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Sets per body part</h2>
          <div className="segmented">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                className={muscleDays === d ? 'active' : ''}
                onClick={() => setMuscleDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <p className="muted chart-sub">Hard sets in the last {muscleDays} days</p>
        {muscles.length === 0 ? (
          <p className="muted">Nothing logged in this period.</p>
        ) : (
          <div className="chart-box" style={{ height: Math.max(120, muscles.length * 34 + 24) }}>
            <ResponsiveContainer>
              <BarChart data={muscles} layout="vertical" margin={{ ...MARGIN, right: 36 }}>
                <CartesianGrid {...GRID} vertical horizontal={false} />
                <XAxis type="number" {...AXIS} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="muscle"
                  {...AXIS}
                  axisLine={false}
                  width={110}
                  interval={0}
                />
                <Tooltip
                  cursor={{ fill: 'var(--panel-2)' }}
                  content={(props) => (
                    <ChartTooltip<{ muscle: string; sets: number; volume: number }>
                      {...props}
                      title={(d) => d.muscle}
                      rows={(d) => [
                        { label: 'Hard sets', value: String(d.sets) },
                        { label: 'Volume', value: `${d.volume.toLocaleString()} kg` },
                      ]}
                    />
                  )}
                />
                <Bar
                  dataKey="sets"
                  fill="var(--accent)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={20}
                  label={{ position: 'right', fill: 'var(--muted)', fontSize: 11 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Strength</h2>
        <ProgressPanel data={progress} />
      </div>

      <div className="panel" id="body-weight">
        <h2>Body weight</h2>
        <BodyWeightPanel userId={userId} entries={bodyWeight} onChanged={onBodyWeightChanged} />
      </div>
    </>
  );
}
