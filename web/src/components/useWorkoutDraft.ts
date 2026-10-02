import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';

/**
 * Keeps the workout being logged safe: every change is saved (to the
 * server, and a copy in the browser for speed/offline), a ticked set is
 * saved at once, and when the form opens again — after switching
 * sections, a reload, the app being closed, or on another phone — the
 * newest saved copy is put back automatically. Nothing to "load".
 *
 * `T` is whatever the form needs to rebuild itself; it must be plain JSON.
 */
export function useWorkoutDraft<T extends object>({
  userId,
  data,
  isEmpty,
  restore,
}: {
  userId: string;
  /** The form's current state, ready to save. */
  data: T;
  /** An untouched form isn't worth saving — and emptying the form clears the draft. */
  isEmpty: (data: T) => boolean;
  /** Put a saved draft back into the form. */
  restore: (data: T) => void;
}) {
  const localKey = `workout-draft.${userId}`;
  const [ready, setReady] = useState(false);
  const [restoredAt, setRestoredAt] = useState<string>();
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef<T>(data);
  const urgent = useRef(false);
  const restoreRef = useRef(restore);
  const isEmptyRef = useRef(isEmpty);
  useEffect(() => {
    restoreRef.current = restore;
    isEmptyRef.current = isEmpty;
  });

  // Once, on open: put back the newest copy (browser or server).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let local: { data: T; updatedAt: string } | null = null;
      try {
        local = JSON.parse(localStorage.getItem(localKey) ?? 'null');
      } catch {
        local = null;
      }
      const remote = (await api.getWorkoutDraft().catch(() => null)) as { data: T; updatedAt: string } | null;
      const newest = [local, remote]
        .filter((d): d is { data: T; updatedAt: string } => !!d?.data)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
      if (cancelled) return;
      if (newest && !isEmptyRef.current(newest.data)) {
        restoreRef.current(newest.data);
        setRestoredAt(newest.updatedAt);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [localKey]);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    const current = latest.current;
    if (isEmptyRef.current(current)) {
      api.clearWorkoutDraft().catch(() => undefined);
    } else {
      api.saveWorkoutDraft(current).catch(() => undefined);
    }
  }, []);

  // Every change: browser copy right away, server copy shortly after (at once for a tick).
  useEffect(() => {
    latest.current = data;
    if (!ready) return;
    try {
      if (isEmptyRef.current(data)) localStorage.removeItem(localKey);
      else localStorage.setItem(localKey, JSON.stringify({ data, updatedAt: new Date().toISOString() }));
    } catch {
      // storage full / private mode — the server copy still works
    }
    window.clearTimeout(timer.current);
    const delay = urgent.current ? 0 : 800;
    urgent.current = false;
    timer.current = window.setTimeout(flush, delay);
  }, [data, ready, localKey, flush]);

  // Leaving or locking the phone: don't wait for the timer.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && timer.current !== undefined) flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  return {
    /** Restored from an earlier visit (ISO time), for a small "restored" note. */
    restoredAt,
    /** Call before a change that must be saved straight away (ticking a set done). */
    saveNow: () => {
      urgent.current = true;
    },
  };
}
