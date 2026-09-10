import type { ExerciseProgress } from '../types';

/**
 * One row per exercise: a tiny bar sparkline of estimated 1RM over time
 * plus the all-time best. No chart library — just scaled <div>s.
 */
export function ProgressPanel({ data }: { data: ExerciseProgress[] }) {
  if (data.length === 0) {
    return <p className="muted">No progress data yet — log some working sets.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Exercise</th>
          <th>Estimated 1RM trend</th>
          <th>Latest</th>
          <th>Best</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => {
          const values = row.points.map((p) => p.bestEstimatedOneRepMax);
          const max = Math.max(...values, 1);
          const latest = values[values.length - 1] ?? 0;
          const isPr = latest >= row.allTimeBestE1rm && values.length > 0;
          return (
            <tr key={row.exerciseId}>
              <td>{row.exerciseName}</td>
              <td>
                <div className="spark">
                  {row.points.map((p) => (
                    <i
                      key={p.date}
                      title={`${p.date}: ~${p.bestEstimatedOneRepMax} kg`}
                      style={{
                        height: `${Math.round(
                          (p.bestEstimatedOneRepMax / max) * 100,
                        )}%`,
                      }}
                    />
                  ))}
                </div>
              </td>
              <td>
                ~{latest} kg {isPr && <span className="pr">PR</span>}
              </td>
              <td>~{row.allTimeBestE1rm} kg</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
