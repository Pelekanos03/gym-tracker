import { useEffect, useState } from 'react';
import type { User } from './types';
import { api, SESSION_EXPIRED } from './api';
import { Dashboard } from './components/Dashboard';
import { TABS, type Badges } from './sections';
import { MobileMenu, type View } from './components/MobileMenu';
import { Logo } from './components/Logo';
import { LoginPage } from './components/LoginPage';
import { AccountPanel } from './components/AccountPanel';
import { Avatar } from './components/Avatar';
import { HealthConsentBanner } from './components/PrivacyChoices';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { LegalPage } from './components/LegalPage';
import { ReportPage } from './components/ReportPage';
import { FeedbackButton } from './components/Feedback';
import { UpdateBanner } from './components/UpdateBanner';
import { versionLabel } from './version';

/**
 * Only a display cache of who was last logged in, so a reload doesn't
 * flash the login page. Who you *are* is decided by the server from the
 * httpOnly session cookie — /auth/me confirms it on every load.
 */
const CACHE_KEY = 'gym-app.actingUser';

function readCache(): User | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
}

/** The few pages that live at their own URL (links in emails, legal pages). */
type Route = 'app' | 'privacy' | 'terms' | 'reset-password' | 'report';

function routeFromPath(): Route {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  if (path === '/reset-password') return 'reset-password';
  if (path === '/report') return 'report';
  return 'app';
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromPath);
  const [me, setMe] = useState<User | null>(readCache);
  const [checked, setChecked] = useState(false);
  /** Which section is showing: a training tab, or the Account page. */
  const [view, setView] = useState<View>('log');
  const [lastTab, setLastTab] = useState<Exclude<View, 'account'>>('log');
  const [menuOpen, setMenuOpen] = useState(false);
  const [badges, setBadges] = useState<Badges>({ friends: 0, messages: 0 });
  const anyBadge = badges.friends + badges.messages > 0;
  const showAccount = view === 'account';

  function show(v: View) {
    setView(v);
    if (v !== 'account') setLastTab(v);
    window.scrollTo({ top: 0 });
  }

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setChecked(true));
    const onExpired = () => setMe(null);
    const onPop = () => setRoute(routeFromPath());
    window.addEventListener(SESSION_EXPIRED, onExpired);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener(SESSION_EXPIRED, onExpired);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  useEffect(() => {
    try {
      if (me) localStorage.setItem(CACHE_KEY, JSON.stringify(me));
      else localStorage.removeItem(CACHE_KEY);
    } catch {
      // storage disabled — the cookie still keeps you logged in
    }
  }, [me]);

  /** Login/sign-up return the bare user; /auth/me adds extras like isAdmin. */
  function loggedIn(user: User) {
    setMe(user);
    api.me().then(setMe).catch(() => undefined);
  }

  function goHome() {
    window.history.pushState(null, '', '/');
    setRoute('app');
  }

  async function logOut() {
    await api.logout().catch(() => undefined);
    setMenuOpen(false);
    setView('log');
    setMe(null);
  }

  const sectionLabel = showAccount ? 'Account' : TABS.find((t) => t.id === view)?.label;

  return (
    <div className="app">
      <UpdateBanner />
      {me && route === 'app' && me.consents && !me.consents.health && (
        <HealthConsentBanner
          onChanged={(user) => setMe((prev) => (prev ? { ...prev, ...user } : user))}
          onOpenAccount={() => show('account')}
        />
      )}
      <div className="topbar">
        {me && route === 'app' && (
          <button
            type="button"
            className="menu-button phone-only"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span />
            <span />
            <span />
            {anyBadge && <i className="menu-dot" aria-label="New friend requests or messages" />}
          </button>
        )}
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            goHome();
            show(lastTab);
          }}
        >
          <Logo />
        </a>
        {me && route === 'app' && <span className="topbar-section phone-only">{sectionLabel}</span>}
        {me && route === 'app' && (
          <div className="topbar-actions">
            {/* Your picture (or a blank face): opens Account; tap again to go back to training. */}
            <button
              type="button"
              className={`avatar-button${showAccount ? ' active' : ''}`}
              onClick={() => show(showAccount ? lastTab : 'account')}
              title={showAccount ? 'Back to training' : `Account — signed in as ${me.name}`}
              aria-label={showAccount ? 'Back to training' : 'Account'}
              aria-pressed={showAccount}
            >
              <Avatar user={me} size={34} />
            </button>
            <button className="ghost small desktop-only" onClick={logOut}>
              Log out
            </button>
          </div>
        )}
      </div>

      {me && route === 'app' && (
        <MobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          me={me}
          view={view}
          onSelect={show}
          onLogOut={logOut}
          badges={badges}
        />
      )}

      {route === 'report' && me && <ReportPage me={me} />}
      {route === 'report' && !me && checked && <LoginPage onLoggedIn={loggedIn} />}
      {route === 'privacy' && <LegalPage page="privacy" />}
      {route === 'terms' && <LegalPage page="terms" />}
      {route === 'reset-password' && (
        <ResetPasswordPage
          onDone={(user) => {
            loggedIn(user);
            goHome();
          }}
        />
      )}

      {route === 'app' && (
        <>
          {!me && checked && <LoginPage onLoggedIn={loggedIn} />}
          {me && showAccount && (
            <AccountPanel
              me={me}
              onChanged={(user) => setMe((prev) => (prev ? { ...prev, ...user } : user))}
              onDeleted={() => {
                setView('log');
                setMe(null);
              }}
            />
          )}
          {/* Kept mounted (just hidden) while on Account, so a half-logged workout isn't lost. */}
          {me && (
            <div hidden={showAccount}>
              <Dashboard
                key={me.id}
                me={me}
                tab={lastTab}
                onTabChange={show}
                onBadges={setBadges}
              />
            </div>
          )}
        </>
      )}

      <footer className="footer muted">
        {me && route === 'app' && (
          <>
            <FeedbackButton /> ·{' '}
          </>
        )}
        <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
        <div className="version">Version {versionLabel()}</div>
      </footer>
    </div>
  );
}

export type { User };
