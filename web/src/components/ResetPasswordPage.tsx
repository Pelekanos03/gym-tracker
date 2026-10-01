import { useState } from 'react';
import { api } from '../api';
import type { User } from '../types';

/** Where the emailed link lands: /reset-password?token=… */
export function ResetPasswordPage({ onDone }: { onDone: (user: User) => void }) {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      onDone(await api.resetPassword(token, password));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 420, margin: '2rem auto' }}>
      <form onSubmit={submit}>
        <h2>Choose a new password</h2>
        {!token && <div className="err">This link is missing its token — open it straight from the email.</div>}
        {error && <div className="err">{error}</div>}
        <div className="field">
          <label>New password (min 8)</label>
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label>Type it again</label>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <button disabled={busy || !token} style={{ width: '100%' }}>
          {busy ? 'Saving…' : 'Save and log in'}
        </button>
        <p className="muted" style={{ fontSize: '.8rem', marginTop: '.75rem' }}>
          Saving logs you out on every other device.
        </p>
      </form>
    </div>
  );
}
