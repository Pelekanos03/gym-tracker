import { useState } from 'react';
import { api } from '../api';
import type { User } from '../types';
import { FeedbackInbox } from './Feedback';
import { bodyWeightCsv, cardioCsv, download, workoutsCsv } from '../exportData';

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
      <DownloadData me={me} />
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
      <div className="row stack-on-phone">
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

/** Your data as CSV (spreadsheets), a printable PDF report, or everything as JSON. */
function DownloadData({ me }: { me: User }) {
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  async function csv(kind: 'workouts' | 'bodyweight' | 'cardio') {
    setBusy(kind);
    setError(undefined);
    try {
      const [name, content] =
        kind === 'workouts'
          ? workoutsCsv(await api.myHistory(me.id))
          : kind === 'bodyweight'
            ? bodyWeightCsv(await api.bodyWeight(me.id))
            : cardioCsv(await api.cardio(me.id));
      download(name, content);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <div className="panel">
      <h2>Download your data</h2>
      <p className="muted">
        Spreadsheet files (CSV) open in Excel, Google Sheets or Numbers. The report is a printable page you can save as
        a PDF.
      </p>
      {error && <div className="err">{error}</div>}
      <div className="download-grid">
        <button type="button" className="ghost" disabled={!!busy} onClick={() => csv('workouts')}>
          {busy === 'workouts' ? 'Preparing…' : 'Workouts (CSV)'}
        </button>
        <button type="button" className="ghost" disabled={!!busy} onClick={() => csv('bodyweight')}>
          {busy === 'bodyweight' ? 'Preparing…' : 'Body weight (CSV)'}
        </button>
        <button type="button" className="ghost" disabled={!!busy} onClick={() => csv('cardio')}>
          {busy === 'cardio' ? 'Preparing…' : 'Cardio (CSV)'}
        </button>
        <a className="button-link" href="/report" target="_blank" rel="noreferrer">
          Report (PDF)
        </a>
        <a className="button-link ghost-link" href="/api/account/export" download>
          Everything (JSON)
        </a>
      </div>
    </div>
  );
}
