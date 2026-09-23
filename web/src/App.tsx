import { useEffect, useState } from 'react';
import type { User } from './types';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/LoginPage';

const ACTING_KEY = 'gym-app.actingUser';

export default function App() {
  const [me, setMe] = useState<User | null>(() => {
    const stored = localStorage.getItem(ACTING_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  });

  useEffect(() => {
    if (me) localStorage.setItem(ACTING_KEY, JSON.stringify(me));
    else localStorage.removeItem(ACTING_KEY);
  }, [me]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <strong>🏋️ gym-app</strong>
          <span>powerlifting &amp; bodybuilding, with friends</span>
        </div>
        {me && (
          <div className="row" style={{ alignItems: 'center', gap: '.75rem' }}>
            <span className="muted">
              Signed in as <strong>{me.name}</strong>
            </span>
            <button className="ghost small" onClick={() => setMe(null)}>
              Log out
            </button>
          </div>
        )}
      </div>

      {!me && <LoginPage onLoggedIn={setMe} />}
      {me && <Dashboard me={me} />}
    </div>
  );
}

export type { User };
