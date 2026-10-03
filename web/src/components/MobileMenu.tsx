import { useEffect, useRef } from 'react';
import type { User } from '../types';
import { TABS, type Badges, type Tab } from '../sections';
import { versionLabel } from '../version';
import { Logo } from './Logo';
import { Avatar } from './Avatar';

export type View = Tab | 'account';

/**
 * The phone navigation: a ☰ button that slides in a panel with every
 * section, plus your name (→ Account) and Log out — kept out of the top
 * bar so they don't take space while training.
 */
export function MobileMenu({
  open,
  onClose,
  me,
  view,
  onSelect,
  onLogOut,
  badges,
}: {
  open: boolean;
  onClose: () => void;
  me: User;
  view: View;
  onSelect: (view: View) => void;
  onLogOut: () => void;
  /** Pending friend requests, unread messages. */
  badges: Badges;
}) {
  const firstRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  function pick(v: View) {
    onSelect(v);
    onClose();
  }

  return (
    <div className={`menu-layer${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="menu-backdrop" onClick={onClose} />
      <nav className="menu-panel" aria-label="Menu" inert={!open}>
        <div className="menu-head">
          <Logo size={28} />
          <button type="button" className="ghost small" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>
        <div className="menu-items">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              className={`menu-item${view === t.id ? ' active' : ''}`}
              aria-current={view === t.id ? 'page' : undefined}
              onClick={() => pick(t.id)}
            >
              {t.label}
              {(badges[t.id as keyof Badges] ?? 0) > 0 && (
                <span className="tab-badge">{badges[t.id as keyof Badges]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="menu-foot">
          <button
            type="button"
            className={`menu-item${view === 'account' ? ' active' : ''}`}
            onClick={() => pick('account')}
          >
            <span className="menu-account">
              <Avatar user={me} size={36} />
              <span>
                {me.name}
                <span className="muted menu-sub">Account</span>
              </span>
            </span>
          </button>
          <button type="button" className="menu-item" onClick={onLogOut}>
            Log out
          </button>
          <div className="menu-version muted">Version {versionLabel()}</div>
        </div>
      </nav>
    </div>
  );
}
