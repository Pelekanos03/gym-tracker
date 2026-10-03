/**
 * Placeholder logo: a dumbbell on the accent colour. Swap this file (and
 * public/favicon.svg, which is the same drawing) for the real one later.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Home" className="logo">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <g fill="#fff">
        <rect x="4" y="11.5" width="3.5" height="9" rx="1.5" />
        <rect x="8.5" y="8.5" width="4" height="15" rx="1.5" />
        <rect x="12.5" y="14.5" width="7" height="3" rx="1" />
        <rect x="19.5" y="8.5" width="4" height="15" rx="1.5" />
        <rect x="24.5" y="11.5" width="3.5" height="9" rx="1.5" />
      </g>
    </svg>
  );
}
