/** Recharts props shared by every chart: recessive hairline grid and axes. */
export const AXIS = {
  stroke: 'var(--border)',
  tick: { fill: 'var(--muted)', fontSize: 11 },
  tickLine: false,
} as const;

export const GRID = { stroke: 'var(--border)', vertical: false } as const;

export const MARGIN = { top: 12, right: 12, bottom: 0, left: 0 };
