/**
 * Shared chart chrome so every Recharts chart reads as one system:
 * recessive hairline grid and axes, one accent hue for the data, and the
 * same tooltip card. Text never wears the series colour.
 */

interface TooltipRow {
  label: string;
  value: string;
}

/**
 * Recharts passes { active, payload } to `content`; `rows` turns the
 * hovered datum into the lines to show.
 */
export function ChartTooltip<T>({
  active,
  payload,
  title,
  rows,
}: {
  active?: boolean;
  // Recharts types each entry's datum as optional/unknown; it's our row.
  payload?: readonly { payload?: unknown }[];
  title: (d: T) => string;
  rows: (d: T) => TooltipRow[];
}) {
  const d = payload?.[0]?.payload as T | undefined;
  if (!active || !d) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{title(d)}</div>
      {rows(d).map((r) => (
        <div key={r.label} className="chart-tooltip-row">
          <span className="muted">{r.label}</span>
          <strong>{r.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function StatTile({
  label,
  value,
  unit,
  sub,
  delta,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  /** Signed change; `good` says whether this direction is good news. */
  delta?: { text: string; good: boolean | null };
}) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
        {unit && <span className="stat-unit"> {unit}</span>}
      </div>
      {delta && (
        <div
          className={`stat-delta ${delta.good === null ? '' : delta.good ? 'up' : 'down'}`}
        >
          {delta.text}
        </div>
      )}
      {sub && <div className="stat-sub muted">{sub}</div>}
    </div>
  );
}
