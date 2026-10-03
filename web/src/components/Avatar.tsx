import { useState } from 'react';
import { avatarUrl } from '../api';

/**
 * A round profile picture — or, until one is added (or if it can't load),
 * a blank face: a plain head-and-shoulders outline.
 */
export function Avatar({
  user,
  size = 32,
}: {
  user: { id: string; name: string; avatarVersion?: string | null };
  size?: number;
}) {
  // Remember which picture failed, so a new one (new version) gets a fresh try.
  const [failed, setFailed] = useState<string | null>(null);
  const version = user.avatarVersion;
  const showPicture = !!version && failed !== version;

  return (
    <span className="avatar" style={{ width: size, height: size }} aria-hidden>
      {showPicture ? (
        <img src={avatarUrl(user.id, version)} alt="" onError={() => setFailed(version)} draggable={false} />
      ) : (
        <svg viewBox="0 0 32 32" width="100%" height="100%">
          <circle cx="16" cy="12.5" r="5.5" fill="currentColor" />
          <path d="M5.5 28.5c1.4-5.6 5.6-8.5 10.5-8.5s9.1 2.9 10.5 8.5" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}
