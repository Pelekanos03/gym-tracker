import { useState } from 'react';
import { api } from '../api';
import type { User } from '../types';

export function LoginPage({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="panel" style={{ maxWidth: 420, margin: '2rem auto' }}>
      <div className="tabs">
        <button
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
        >
          Log in
        </button>
        <button
          className={mode === 'signup' ? 'active' : ''}
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
      </div>
      {mode === 'login' ? (
        <LoginForm onLoggedIn={onLoggedIn} />
      ) : (
        <SignupForm onLoggedIn={onLoggedIn} />
      )}
    </div>
  );
}

function LoginForm({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const user = await api.login({ email, password });
      onLoggedIn(user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Log in</h2>
      {error && <div className="err">{error}</div>}
      <div className="field">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="field">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button disabled={busy} style={{ width: '100%' }}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
      <p className="muted" style={{ marginTop: '.75rem', fontSize: '.8rem' }}>
        Demo accounts: alex@example.com / sam@example.com, password{' '}
        <code>password123</code>
      </p>
    </form>
  );
}

function SignupForm({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const user = await api.createUser(form);
      onLoggedIn(user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Create an account</h2>
      {error && <div className="err">{error}</div>}
      <div className="field">
        <label>Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label>Password (min 8)</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </div>
      <button disabled={busy} style={{ width: '100%' }}>
        {busy ? 'Creating…' : 'Create account'}
      </button>
    </form>
  );
}
