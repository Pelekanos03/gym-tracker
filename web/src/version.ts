/** "1 Oct, 18:20" — the build time, readable. */
export function versionLabel(version = __APP_VERSION__): string {
  if (version === 'dev') return 'dev';
  const d = new Date(version);
  return Number.isNaN(d.getTime())
    ? version
    : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}
