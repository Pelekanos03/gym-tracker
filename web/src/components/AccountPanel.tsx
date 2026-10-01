import { useState } from 'react';
import { api } from '../api';
import type { User } from '../types';
import { FeedbackInbox } from './Feedback';

/** Your account: change password, download your data, delete everything. */
export function AccountPanel({ me, onDeleted }: { me: User; onDeleted: () => void }) {
  return (
    <>
      <div className="panel">
        <h2>Account</h2>
        <p className="muted" style={{ margin: 0 }}>
          {me.name} · {me.email}
        </p>
      </div>
      {me.isAdmin && <FeedbackInbox />}
      <ChangePassword />
      <div className="panel">
        <h2>Download your data</h2>
        <p className="muted">
          A JSON file with everything stored about you: workouts and sets, programs, body
          weight, your exercises, friends and coaching links. Videos aren't included in the file
          (they're too large) — it notes which sets have one.
        </p>
        <a className="button-link" href="/api/account/export" download>
          Download my data
        </a>
      </div>
      <DeleteAccount onDeleted={onDeleted} />
    </>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    setOk(false);
    try {
      await api.changePassword(current, next);
      setCurrent('');
      setNext('');
      setOk(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>Change password</h2>
      {error && <div className="err">{error}</div>}
      {ok && <p className="pr">Password changed. Other devices have been logged out.</p>}
      <div className="row">
        <div>
          <label>Current password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div>
          <label>New password (min 8)</label>
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <button disabled={busy}>{busy ? 'Saving…' : 'Change'}</button>
        </div>
      </div>
    </form>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.deleteAccount(password);
      onDeleted();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="panel danger-zone">
      <h2>Delete account</h2>
      <p className="muted">
        Permanently deletes your account, workouts, videos, programs, body weight and friend and
        coaching links. This can't be undone — download your data first if you want a copy.
      </p>
      {!open ? (
        <button type="button" className="ghost danger" onClick={() => setOpen(true)}>
          Delete my account…
        </button>
      ) : (
        <form onSubmit={submit}>
          {error && <div className="err">{error}</div>}
          <div className="field" style={{ maxWidth: 320 }}>
            <label>Your password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>I understand everything will be deleted for good.</span>
          </label>
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <button className="danger" disabled={busy || !confirmed || !password} style={{ flex: '0 0 auto' }}>
              {busy ? 'Deleting…' : 'Delete everything'}
            </button>
            <button type="button" className="ghost" onClick={() => setOpen(false)} style={{ flex: '0 0 auto' }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
