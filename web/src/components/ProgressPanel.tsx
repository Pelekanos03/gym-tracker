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
import type { ExerciseProgress } from '../types';

/**
 * A real line chart of estimated 1RM over time for one exercise at a time
 * (pick it from the dropdown, or click a row below), plus a summary table
 * of every exercise's latest and all-time-best estimated 1RM.
 */
export function ProgressPanel({ data }: { data: ExerciseProgress[] }) {
  const [selectedId, setSelectedId] = useState<string>('');

  if (data.length === 0) {
    return <p className="muted">No progress data yet — log some working sets.</p>;
  }

  const selected = data.find((d) => d.exerciseId === selectedId) ?? data[0];

  return (
    <>
      <div className="field" style={{ maxWidth: 280 }}>
        <label>Exercise</label>
        <select
          value={selected.exerciseId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {data.map((d) => (
            <option key={d.exerciseId} value={d.exerciseId}>
              {d.exerciseName}
            </option>
          ))}
        </select>
      </div>

      <div style={{ width: '100%', height: 260, marginTop: '.75rem' }}>
        <ResponsiveContainer>
          <LineChart data={selected.points} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} width={48} />
            <Tooltip
              contentStyle={{
                background: 'var(--panel-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--text)' }}
              formatter={(value) => [`~${value} kg`, 'Est. 1RM']}
            />
            <Line
              type="monotone"
              dataKey="bestEstimatedOneRepMax"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="table-scroll" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Latest</th>
              <th>Best</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const values = row.points.map((p) => p.bestEstimatedOneRepMax);
              const latest = values[values.length - 1] ?? 0;
              const isPr = latest >= row.allTimeBestE1rm && values.length > 0;
              return (
                <tr
                  key={row.exerciseId}
                  onClick={() => setSelectedId(row.exerciseId)}
                  style={{
                    cursor: 'pointer',
                    background:
                      row.exerciseId === selected.exerciseId ? 'var(--accent-weak)' : undefined,
                  }}
                >
                  <td>{row.exerciseName}</td>
                  <td>
                    ~{latest} kg {isPr && <span className="pr">PR</span>}
                  </td>
                  <td>~{row.allTimeBestE1rm} kg</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
