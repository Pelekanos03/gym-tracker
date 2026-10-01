import { useEffect, useRef, useState } from 'react';
import { api, videoUrl } from '../api';

/**
 * `accept="video/*"` without `capture`: on a phone the picker then offers
 * both "Take video" (camera) and choosing an existing clip from the
 * gallery; on desktop it's a normal file dialog.
 */
function VideoFileInput({
  inputRef,
  onFile,
  onTooBig,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onTooBig: (message: string) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept="video/*"
      hidden
      onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // picking the same file again should still fire
        if (!file) return;
        const maxMb = await maxVideoMb;
        if (file.size > maxMb * 1024 * 1024) {
          onTooBig(`That video is ${Math.round(file.size / (1024 * 1024))} MB — the limit is ${maxMb} MB. Try a shorter clip.`);
          return;
        }
        onFile(file);
      }}
    />
  );
}

/** The server's upload limit, fetched once; checked before uploading so a too-big clip fails fast. */
const maxVideoMb: Promise<number> = api
  .authConfig()
  .then((c) => c.maxVideoMb)
  .catch(() => Infinity);

/**
 * Video control for a set that's already logged: play it, or — for the
 * lifter themself — upload / replace / remove it. Friends viewing get
 * play-only (pass no `userId`).
 */
export function SetVideoButton({
  setId,
  videoFile,
  userId,
  onChanged,
}: {
  setId: string;
  videoFile: string | null;
  userId?: string;
  onChanged?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState<string>();
  const [playing, setPlaying] = useState(false);

  async function upload(file: File) {
    if (!userId) return;
    setError(undefined);
    setProgress(0);
    try {
      await api.uploadSetVideo(setId, userId, file, setProgress);
      onChanged?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgress(undefined);
    }
  }

  async function remove() {
    if (!userId) return;
    setError(undefined);
    try {
      await api.removeSetVideo(setId, userId);
      setPlaying(false);
      onChanged?.();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (progress !== undefined) {
    return <UploadProgress fraction={progress} />;
  }

  return (
    <span className="video-control">
      {videoFile ? (
        <button type="button" className="ghost small" onClick={() => setPlaying(true)}>
          Play video
        </button>
      ) : (
        userId && (
          <button
            type="button"
            className="ghost small"
            onClick={() => inputRef.current?.click()}
            title="Record or choose a video of this set"
          >
            Add video
          </button>
        )
      )}
      {userId && <VideoFileInput inputRef={inputRef} onFile={upload} onTooBig={setError} />}
      {error && <span className="err-inline">{error}</span>}
      {playing && videoFile && (
        <VideoPlayer
          src={videoUrl(setId)}
          onClose={() => setPlaying(false)}
          actions={
            userId && (
              <>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setPlaying(false);
                    inputRef.current?.click();
                  }}
                >
                  Replace
                </button>
                <button type="button" className="ghost" onClick={remove}>
                  Remove
                </button>
              </>
            )
          }
        />
      )}
    </span>
  );
}

/**
 * Video control for a set that hasn't been saved yet (the log form): just
 * holds onto the chosen File; the form uploads it once the session exists.
 */
export function PendingVideoButton({
  file,
  onChange,
}: {
  file: File | undefined;
  onChange: (file: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  return (
    <span className="video-control">
      {error && <span className="err-inline">{error}</span>}
      {file ? (
        <>
          <span className="tag" title={file.name}>
            Video · {formatBytes(file.size)}
          </span>
          <button
            type="button"
            className="ghost small"
            onClick={() => onChange(undefined)}
            aria-label="Remove video"
          >
            ✕
          </button>
        </>
      ) : (
        <button
          type="button"
          className="ghost small"
          onClick={() => inputRef.current?.click()}
          title="Record or choose a video of this set — uploaded when you log the session"
        >
          Video
        </button>
      )}
      <VideoFileInput
        inputRef={inputRef}
        onFile={(f) => {
          setError(undefined);
          onChange(f);
        }}
        onTooBig={setError}
      />
    </span>
  );
}

export function UploadProgress({ fraction, label }: { fraction: number; label?: string }) {
  return (
    <span className="upload-progress" role="progressbar" aria-valuenow={Math.round(fraction * 100)}>
      <span className="upload-bar">
        <span style={{ width: `${Math.round(fraction * 100)}%` }} />
      </span>
      <span className="muted">{label ?? `${Math.round(fraction * 100)}%`}</span>
    </span>
  );
}

function VideoPlayer({
  src,
  onClose,
  actions,
}: {
  src: string;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="video-modal" onClick={(e) => e.stopPropagation()}>
        {failed ? (
          <p className="muted" style={{ padding: '1rem' }}>
            This browser can't play that video format (iPhone HEVC clips often only play in
            Safari). <a href={src} download>Download it</a> instead.
          </p>
        ) : (
          <video src={src} controls autoPlay playsInline onError={() => setFailed(true)} />
        )}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: '.6rem' }}>
          {actions}
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
