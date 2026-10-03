import { api } from '../api';
import { useAsync } from '../hooks';
import type { User } from '../types';
import { cardioLabel } from '../types';
import {
  compact,
  completed,
  formatDay,
  formatDuration,
  groupByExercise,
  kg2,
  sessionVolume,
  topSetLabel,
  todayString,
} from '../stats';
import { Logo } from './Logo';

/**
 * A printable summary of your training. "Save as PDF" opens the browser's
 * print dialog, where every phone and computer can save it as a PDF.
 * The print styles (index.css, @media print) make it plain black-on-white.
 */
export function ReportPage({ me }: { me: User }) {
  const sessions = useAsync(() => api.myHistory(me.id), [me.id]);
  const progress = useAsync(() => api.myProgress(me.id), [me.id]);
  const bodyWeight = useAsync(() => api.bodyWeight(me.id), [me.id]);
  const cardio = useAsync(() => api.cardio(me.id), [me.id]);
  const loading = !sessions.data || !progress.data || !bodyWeight.data || !cardio.data;

  if (loading) return <div className="panel">Preparing your report…</div>;

  const done = completed(sessions.data!);
  const first = done[done.length - 1]?.date;
  const last = done[0]?.date;
  const volume = done.reduce((v, s) => v + sessionVolume(s), 0);
  const cardioMinutes = Math.round(cardio.data!.reduce((v, c) => v + c.durationSeconds, 0) / 60);
  const bw = bodyWeight.data!;

  return (
    <article className="report">
      <div className="report-actions no-print">
        <button type="button" onClick={() => window.print()}>
          Save as PDF
        </button>
        <button type="button" className="ghost" onClick={() => window.close()}>
          Close
        </button>
        <p className="muted">
          In the print screen choose <strong>Save as PDF</strong> as the printer (on iPhone: Share → Print, then
          pinch out on the preview and share/save it).
        </p>
      </div>

      <header className="report-head">
        <Logo size={36} />
        <div>
          <h1>Training report — {me.name}</h1>
          <p className="muted">
            {first && last ? `${formatDay(first)} – ${formatDay(last)}` : 'No workouts yet'} · made {formatDay(todayString())}
          </p>
        </div>
      </header>

      <section className="report-tiles">
        <div><strong>{done.length}</strong> workouts</div>
        <div><strong>{compact(volume)}</strong> kg lifted</div>
        <div><strong>{cardio.data!.length}</strong> cardio sessions · {cardioMinutes} min</div>
        {bw.length > 0 && (
          <div>
            <strong>{kg2(bw[bw.length - 1].weight)}</strong> kg body weight
          </div>
        )}
      </section>

      {progress.data!.length > 0 && (
        <section>
          <h2>Personal records (estimated 1RM)</h2>
          <table>
            <thead>
              <tr><th>Exercise</th><th>Best e1RM</th><th>Top set</th><th>Date</th></tr>
            </thead>
            <tbody>
              {[...progress.data!].sort((a, b) => b.allTimeBestE1rm - a.allTimeBestE1rm).map((p) => {
                const best = p.points.find((x) => x.bestEstimatedOneRepMax === p.allTimeBestE1rm);
                return (
                  <tr key={p.exerciseId}>
                    <td>{p.exerciseName}</td>
                    <td>{p.allTimeBestE1rm} kg</td>
                    <td>{best ? `${best.topSet.weight} kg × ${best.topSet.reps}` : ''}</td>
                    <td>{best ? formatDay(best.date) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {bw.length > 0 && (
        <section>
          <h2>Body weight</h2>
          <table>
            <thead><tr><th>Date</th><th>Weight</th></tr></thead>
            <tbody>
              {[...bw].reverse().slice(0, 30).map((e) => (
                <tr key={e.id}><td>{formatDay(e.date)}</td><td>{kg2(e.weight)} kg</td></tr>
              ))}
            </tbody>
          </table>
          {bw.length > 30 && <p className="muted">Latest 30 of {bw.length} readings (all of them are in the CSV).</p>}
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2>Workouts</h2>
          {done.slice(0, 40).map((s) => (
            <div key={s.id} className="report-session">
              <h3>
                {formatDay(s.date)}
                {s.programDay && <span className="muted"> · {s.programDay.name}</span>}
                <span className="muted"> · {compact(sessionVolume(s))} kg</span>
              </h3>
              <ul>
                {groupByExercise(s.sets).map((g) => (
                  <li key={g.exerciseId}>
                    {g.name}: {g.sets.length} sets, top {topSetLabel(g.sets)}
                  </li>
                ))}
              </ul>
              {s.notes && <p className="muted">“{s.notes}”</p>}
            </div>
          ))}
          {done.length > 40 && <p className="muted">Latest 40 of {done.length} workouts (all of them are in the CSV).</p>}
        </section>
      )}

      {cardio.data!.length > 0 && (
        <section>
          <h2>Cardio</h2>
          <table>
            <thead><tr><th>Date</th><th>Activity</th><th>Time</th><th>Distance</th><th>HR</th></tr></thead>
            <tbody>
              {cardio.data!.slice(0, 40).map((c) => (
                <tr key={c.id}>
                  <td>{formatDay(c.date)}</td>
                  <td>{cardioLabel(c.activity)}</td>
                  <td>{formatDuration(c.durationSeconds)}</td>
                  <td>{c.distanceKm != null ? `${c.distanceKm} km` : ''}</td>
                  <td>{c.avgHeartRate ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </article>
  );
}
