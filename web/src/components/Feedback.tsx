import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';

/** "Send feedback" link + a small dialog. Notes land in the admin's inbox (Account page). */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="link-inline" onClick={() => setOpen(true)}>
        Send feedback
      </button>
      {open && <FeedbackDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    // Which section they were looking at, so "this is confusing" has context.
    const page =
      document.querySelector('.tabs [aria-current="page"]')?.textContent?.trim() ??
      window.location.pathname;
    try {
      await api.sendFeedback(message, page);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="panel feedback-dialog" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Send feedback</h2>
        {sent ? (
          <p>Thanks — got it!</p>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              What's confusing, broken, missing, or great? Anything helps.
            </p>
            {error && <div className="err">{error}</div>}
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. I couldn't find where to add a set…"
              autoFocus
              required
              minLength={2}
            />
          </>
        )}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '.6rem' }}>
          <button type="button" className="ghost" onClick={onClose} style={{ flex: '0 0 auto' }}>
            {sent ? 'Close' : 'Cancel'}
          </button>
          {!sent && (
            <button disabled={busy || message.trim().length < 2} style={{ flex: '0 0 auto' }}>
              {busy ? 'Sending…' : 'Send'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/** Admin inbox: everything testers sent, newest first. */
export function FeedbackInbox() {
  const items = useAsync(() => api.listFeedback(), []);
  const WHEN = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>
          Feedback from testers{' '}
          <span className="muted" style={{ fontWeight: 400 }}>
            · {items.data?.length ?? 0}
          </span>
        </h2>
        <button className="ghost small" onClick={items.reload}>
          Refresh
        </button>
      </div>
      {items.error && <div className="err">{items.error}</div>}
      {items.data?.length === 0 && <p className="muted">Nothing yet.</p>}
      <div className="feedback-list">
        {items.data?.map((f) => (
          <div key={f.id} className="feedback-item">
            <div className="feedback-meta muted">
              <strong>{f.from.name}</strong> · {f.from.email} · {WHEN.format(new Date(f.createdAt))}
              {f.page && ` · on ${f.page}`}
              {/(iPhone|Android|Mobile)/i.test(f.userAgent) && ' · phone'}
            </div>
            <p className="feedback-message">{f.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
