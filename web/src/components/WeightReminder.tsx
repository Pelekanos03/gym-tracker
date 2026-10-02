import { useState } from 'react';
import { api } from '../api';
import type { WeightReminder } from '../types';
import { todayString } from '../stats';
import { decimalInput } from '../decimal';

/**
 * The optional "log your weight" nudge, shown at the top of the app when
 * one is due. Log it right here, or "Not today" hides it until tomorrow.
 */
export function WeightReminderBar({ userId, onLogged }: { userId: string; onLogged: () => void }) {
  const dismissKey = `bw-reminder-dismissed.${userId}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(dismissKey) === todayString();
    } catch {
      return false;
    }
  });
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  if (dismissed) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = Math.round(Number(weight.replace(',', '.')) * 100) / 100;
    if (!value || value < 20 || value > 400) {
      setError('Enter your weight in kg.');
      return;
    }
    setBusy(true);
    try {
      await api.logBodyWeight(userId, { date: todayString(), weight: value });
      onLogged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="reminder-bar" onSubmit={save}>
      <span className="reminder-text">Time to log your body weight</span>
      <input
        type="text"
        inputMode="decimal"
        step={0.01}
        min={20}
        max={400}
        value={weight}
        onChange={(e) => setWeight(decimalInput(e.target.value))}
        placeholder="kg"
        aria-label="Body weight in kg"
      />
      <button disabled={busy}>Save</button>
      <button
        type="button"
        className="ghost"
        onClick={() => {
          try {
            localStorage.setItem(dismissKey, todayString());
          } catch {
            // can't remember the dismissal — it just shows again next time
          }
          setDismissed(true);
        }}
      >
        Not today
      </button>
      {error && <span className="err-inline">{error}</span>}
    </form>
  );
}

/** Off / Daily / Weekly — saved on your account, so it applies on every device. */
export function WeightReminderSetting({
  value,
  onChange,
}: {
  value: WeightReminder;
  onChange: (value: WeightReminder) => void;
}) {
  const [error, setError] = useState<string>();
  async function pick(v: WeightReminder) {
    setError(undefined);
    try {
      await api.setPreferences({ weightReminder: v });
      onChange(v);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <div className="reminder-setting">
      <span className="muted">Reminder</span>
      <div className="segmented">
        {(['off', 'daily', 'weekly'] as WeightReminder[]).map((v) => (
          <button key={v} type="button" className={value === v ? 'active' : ''} onClick={() => pick(v)}>
            {v === 'off' ? 'Off' : v === 'daily' ? 'Daily' : 'Weekly'}
          </button>
        ))}
      </div>
      {error && <span className="err-inline">{error}</span>}
    </div>
  );
}
