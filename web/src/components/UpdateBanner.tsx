import { useEffect, useState } from 'react';

const CHECK_EVERY_MS = 60_000;

/**
 * Phones keep tabs alive for days and re-show them without reloading, so
 * an open tab would keep running an old build forever. This checks
 * /version.json every minute and whenever the app comes back to the
 * foreground; once a newer build is live it shows a bar to update.
 * It asks rather than reloading by itself, so a half-logged workout is
 * never thrown away.
 */
export function UpdateBanner() {
  const [newer, setNewer] = useState(false);

  useEffect(() => {
    if (__APP_VERSION__ === 'dev') return; // the dev server hot-reloads anyway
    let stopped = false;
    async function check() {
      try {
        const res = await fetch('/version.json', { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (!stopped && version && version !== __APP_VERSION__) setNewer(true);
      } catch {
        // offline or tunnel down — try again next time
      }
    }
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    // Coming back to the app: switching to its tab, focusing the window, or
    // a page restored from the back/forward cache (iPhones do this a lot).
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
    };
  }, []);

  if (!newer) return null;
  return (
    <div className="update-banner" role="status">
      <span>A new version of the app is available.</span>
      <button type="button" onClick={() => window.location.reload()}>
        Update
      </button>
    </div>
  );
}
