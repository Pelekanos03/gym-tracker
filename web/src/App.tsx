import { useEffect, useState } from 'react';
import type { User } from './types';
import { api, SESSION_EXPIRED } from './api';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/LoginPage';
import { AccountPanel } from './components/AccountPanel';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { LegalPage } from './components/LegalPage';
import { FeedbackButton } from './components/Feedback';

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
type Route = 'app' | 'privacy' | 'terms' | 'reset-password';

function routeFromPath(): Route {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  if (path === '/reset-password') return 'reset-password';
  return 'app';
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromPath);
  const [me, setMe] = useState<User | null>(readCache);
  const [checked, setChecked] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

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
    setShowAccount(false);
    setMe(null);
  }

  return (
    <div className="app">
      <div className="topbar">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            goHome();
            setShowAccount(false);
          }}
        >
          <strong>gym-app</strong>
          <span>powerlifting &amp; bodybuilding, with friends</span>
        </a>
        {me && route === 'app' && (
          <div className="row" style={{ alignItems: 'center', gap: '.5rem', flex: '0 0 auto' }}>
            <button
              className={`ghost small${showAccount ? ' active-ghost' : ''}`}
              onClick={() => setShowAccount((s) => !s)}
              title={`Signed in as ${me.name}`}
            >
              {showAccount ? 'Back to training' : me.name}
            </button>
            <button className="ghost small" onClick={logOut}>
              Log out
            </button>
          </div>
        )}
      </div>

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
              onDeleted={() => {
                setShowAccount(false);
                setMe(null);
              }}
            />
          )}
          {/* Kept mounted (just hidden) while on Account, so a half-logged workout isn't lost. */}
          {me && (
            <div hidden={showAccount}>
              <Dashboard key={me.id} me={me} />
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
      </footer>
    </div>
  );
}

export type { User };
