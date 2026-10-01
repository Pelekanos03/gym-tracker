import { useEffect, useState } from 'react';
import { api } from '../api';
import type { User } from '../types';

type Mode = 'login' | 'signup' | 'forgot';

export function LoginPage({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [mode, setMode] = useState<Mode>('login');

  return (
    <div className="panel" style={{ maxWidth: 420, margin: '2rem auto' }}>
      {mode !== 'forgot' && (
        <div className="tabs auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Log in
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Sign up
          </button>
        </div>
      )}
      {mode === 'login' && (
        <LoginForm onLoggedIn={onLoggedIn} onForgot={() => setMode('forgot')} />
      )}
      {mode === 'signup' && <SignupForm onLoggedIn={onLoggedIn} />}
      {mode === 'forgot' && <ForgotForm onBack={() => setMode('login')} />}
    </div>
  );
}

function LoginForm({
  onLoggedIn,
  onForgot,
}: {
  onLoggedIn: (user: User) => void;
  onForgot: () => void;
}) {
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
          autoComplete="email"
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button disabled={busy} style={{ width: '100%' }}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
      <button type="button" className="link-button" onClick={onForgot}>
        Forgot your password?
      </button>
      {/* Dev only: the seeded demo accounts. Never shipped in a production build. */}
      {import.meta.env.DEV && (
        <p className="muted" style={{ marginTop: '.75rem', fontSize: '.8rem' }}>
          Demo accounts: alex@example.com / sam@example.com, password{' '}
          <code>password123</code>
        </p>
      )}
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Reset your password</h2>
      {sent ? (
        <p>
          If an account exists for <strong>{email}</strong>, we've emailed it a link to choose a
          new password. The link works for one hour.
        </p>
      ) : (
        <>
          <p className="muted">Enter your email and we'll send you a link to set a new password.</p>
          {error && <div className="err">{error}</div>}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <button disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </>
      )}
      <button type="button" className="link-button" onClick={onBack}>
        Back to log in
      </button>
    </form>
  );
}

function SignupForm({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', inviteCode: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [inviteRequired, setInviteRequired] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .authConfig()
      .then((c) => setInviteRequired(c.inviteRequired))
      .catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const user = await api.createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        acceptTerms,
        inviteCode: inviteRequired ? form.inviteCode : undefined,
      });
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
      {inviteRequired && (
        <div className="field">
          <label>Invite code</label>
          <input
            value={form.inviteCode}
            onChange={(e) => setForm({ ...form, inviteCode: e.target.value })}
            required
            autoComplete="off"
          />
        </div>
      )}
      <div className="field">
        <label>Name</label>
        <input
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label>Email</label>
        <input
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label>Password (min 8)</label>
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          required
        />
        <span>
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noreferrer">
            terms
          </a>{' '}
          and the{' '}
          <a href="/privacy" target="_blank" rel="noreferrer">
            privacy policy
          </a>
          .
        </span>
      </label>
      <button disabled={busy || !acceptTerms} style={{ width: '100%' }}>
        {busy ? 'Creating…' : 'Create account'}
      </button>
    </form>
  );
}
