import { useState } from 'react';
import { api } from '../api';
import type { User } from '../types';

/**
 * The wording of each consent, in one place so sign-up and the Account
 * page say exactly the same thing. Must match the privacy policy.
 */
export const CONSENT_TEXT = {
  health:
    'I agree that the app stores the health-related information I choose to log — body weight, workouts, cardio and set videos — to run the service for me.',
  partners:
    'Share my training data with partners named in the privacy policy (e.g. sports-science research). Never my name, email, photos, videos or messages.',
  ai: 'Use my training data to train AI models, e.g. to suggest programs. Never my name, email, photos, videos or messages.',
} as const;

type Choice = 'partners' | 'ai';

/** Account → Your data choices: the two optional consents, each switchable any time. */
export function PrivacyChoices({ me, onChanged }: { me: User; onChanged: (user: User) => void }) {
  const [busy, setBusy] = useState<Choice>();
  const [error, setError] = useState<string>();

  async function toggle(choice: Choice, value: boolean) {
    setBusy(choice);
    setError(undefined);
    try {
      onChanged(await api.setConsents({ [choice]: value }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <div className="panel">
      <h2>Your data choices</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Both are optional and off unless you turn them on. The app works the same either way, and you can
        change your mind at any time. <a href="/privacy">Privacy policy</a>
      </p>
      {error && <div className="err">{error}</div>}
      {(['partners', 'ai'] as const).map((choice) => (
        <label key={choice} className="checkbox-row">
          <input
            type="checkbox"
            checked={!!me.consents?.[choice]}
            disabled={busy !== undefined}
            onChange={(e) => toggle(choice, e.target.checked)}
          />
          <span>{CONSENT_TEXT[choice]}</span>
        </label>
      ))}
      <p className="muted" style={{ margin: 0, fontSize: '.82rem' }}>
        Storing your health data to run the app:{' '}
        {me.consents?.health ? 'agreed' : 'not agreed yet'}. To withdraw it, delete your data or your
        account below.
      </p>
    </div>
  );
}

/**
 * Accounts made before the health-data consent existed are asked for it
 * once, at the top of the app. Not ticked for them — they choose.
 */
export function HealthConsentBanner({
  onChanged,
  onOpenAccount,
}: {
  onChanged: (user: User) => void;
  onOpenAccount: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function agree() {
    setBusy(true);
    setError(undefined);
    try {
      onChanged(await api.setConsents({ health: true }));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="consent-banner" role="region" aria-label="Privacy update">
      <strong>We've updated our privacy policy</strong>
      <p>
        EU law asks us for your explicit agreement to store health-related data.{' '}
        <a href="/privacy" target="_blank" rel="noreferrer">
          Read the privacy policy
        </a>
        .
      </p>
      <label className="checkbox-row">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>{CONSENT_TEXT.health}</span>
      </label>
      {error && <div className="err">{error}</div>}
      <div className="row" style={{ alignItems: 'center' }}>
        <button type="button" onClick={agree} disabled={!checked || busy} style={{ flex: '0 0 auto' }}>
          Confirm
        </button>
        <button type="button" className="link-inline" onClick={onOpenAccount} style={{ flex: '0 0 auto' }}>
          I don't agree — delete my data
        </button>
      </div>
    </div>
  );
}
