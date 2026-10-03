import { useEffect, useRef, useState } from 'react';
import { api, videoUrl } from '../api';
import type { SetLog } from '../types';
import { setTitle } from '../stats';
import { Overlay } from './Overlay';

/**
 * One video per set. On a logged set you can play it, and — if it's your
 * own set — replace or remove it; your accepted coach can play it too
 * (the API decides who may stream it). In the log form a set holds one
 * picked clip that uploads once its set is ticked (saved).
 */

/** The server's upload limit, fetched once; checked before uploading so a too-big clip fails fast. */
const maxVideoMb: Promise<number> = api
  .authConfig()
  .then((c) => c.maxVideoMb)
  .catch(() => Infinity);

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
          onTooBig(
            `That video is ${Math.round(file.size / (1024 * 1024))} MB — the limit is ${maxMb} MB. Try a shorter clip.`,
          );
          return;
        }
        onFile(file);
      }}
    />
  );
}

/**
 * Video control on a logged set: "Play video" when it has one; for the
 * lifter, "Add video" when it doesn't. Replace / Remove live in the player.
 */
export function SetVideoButton({
  setId,
  videoFile,
  videoNote,
  userId,
  title,
  onChanged,
}: {
  setId: string;
  videoFile: string | null;
  videoNote?: string | null;
  /** The viewer, when it's their own set (may add, replace, remove). */
  userId?: string;
  title: string;
  onChanged?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number>();
  const [notice, setNotice] = useState<string>();
  const [playing, setPlaying] = useState(false);

  async function upload(file: File) {
    if (!userId) return;
    setNotice(undefined);
    setPlaying(false);
    setProgress(0);
    try {
      await api.uploadSetVideo(setId, userId, file, setProgress);
      onChanged?.();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setProgress(undefined);
    }
  }

  async function remove() {
    if (!userId) return;
    try {
      await api.removeSetVideo(setId, userId);
      setPlaying(false);
      onChanged?.();
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  if (progress !== undefined) {
    return (
      <UploadProgress
        fraction={progress}
        label={`Uploading ${Math.round(progress * 100)}% — keep this page open`}
      />
    );
  }

  return (
    <span className="video-control">
      {videoFile ? (
        <button type="button" className="small video-play" onClick={() => setPlaying(true)}>
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
      {userId && <VideoFileInput inputRef={inputRef} onFile={upload} onTooBig={setNotice} />}
      {notice && <VideoNotice message={notice} onClose={() => setNotice(undefined)} />}
      {playing && videoFile && (
        <VideoPlayer
          src={videoUrl(setId)}
          title={title}
          onClose={() => setPlaying(false)}
          note={
            userId
              ? { kind: 'saved', value: videoNote ?? '', save: (n) => saveNote(setId, userId, n, onChanged) }
              : { kind: 'read', value: videoNote ?? '' }
          }
          actions={
            userId && (
              <>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => inputRef.current?.click()}
                  title="A set holds one video — the new one replaces this one"
                >
                  Replace
                </button>
                <button type="button" className="ghost danger" onClick={remove}>
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
 * A row of thumbnails for every set in a session that has a video, so
 * videos are visible at a glance (to the lifter and their coach) without
 * opening each set. Tap one to play it.
 */
export function VideoStrip({
  sets,
  userId,
  onChanged,
}: {
  /** The session's sets, each with its number within its exercise. */
  sets: { set: SetLog; n: number }[];
  /** The viewer, when it's their own session (may remove). */
  userId?: string;
  onChanged?: () => void;
}) {
  const [playing, setPlaying] = useState<{ set: SetLog; n: number }>();
  const withVideo = sets.filter((s) => s.set.videoFile);
  if (withVideo.length === 0) return null;

  async function remove(setId: string) {
    if (!userId) return;
    await api.removeSetVideo(setId, userId);
    setPlaying(undefined);
    onChanged?.();
  }

  return (
    <div className="video-strip" aria-label="Videos">
      {withVideo.map(({ set, n }) => (
        <button
          key={set.id}
          type="button"
          className="video-thumb"
          onClick={() => setPlaying({ set, n })}
          title={`Play: ${setTitle(set, n)}`}
        >
          {/* #t=0.1 makes the browser fetch and show an early frame as a still. */}
          <video src={`${videoUrl(set.id)}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} />
          <span className="video-thumb-play" aria-hidden>
            ▶
          </span>
          <span className="video-thumb-label">
            {set.videoNote && <span aria-label="has a comment">💬 </span>}
            {set.exercise.name} · {n}
          </span>
        </button>
      ))}
      {playing && (
        <VideoPlayer
          src={videoUrl(playing.set.id)}
          title={setTitle(playing.set, playing.n)}
          onClose={() => setPlaying(undefined)}
          note={
            userId
              ? {
                  kind: 'saved',
                  value: playing.set.videoNote ?? '',
                  save: (n) => saveNote(playing.set.id, userId, n, onChanged),
                }
              : { kind: 'read', value: playing.set.videoNote ?? '' }
          }
          actions={
            userId && (
              <button type="button" className="ghost danger" onClick={() => remove(playing.set.id)}>
                Remove
              </button>
            )
          }
        />
      )}
    </div>
  );
}

/**
 * The log form's video control for a set that isn't saved yet. One clip
 * per set: "Add video", then "Video ✓" — tap it to preview the clip and
 * change or remove it. It uploads once the set is ticked.
 */
export function PendingVideoButton({
  file,
  onChange,
  note,
  onNoteChange,
}: {
  file: File | undefined;
  onChange: (file: File | undefined) => void;
  /** The comment that goes with the clip, saved with the set. */
  note: string;
  onNoteChange: (note: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string>();
  /**
   * A temporary blob: URL for the picked file while the preview is open.
   * Made when it opens and released when it closes (not in an effect —
   * React's dev double-mount would release it before it's played).
   */
  const [previewUrl, setPreviewUrl] = useState<string>();

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(undefined);
  }

  return (
    <span className="video-control">
      {file ? (
        <button
          type="button"
          className="small video-attached"
          onClick={() => setPreviewUrl(URL.createObjectURL(file))}
        >
          Video ✓
        </button>
      ) : (
        <button
          type="button"
          className="ghost small"
          onClick={() => inputRef.current?.click()}
          title="Record or choose a video of this set — it uploads once the set is ticked"
        >
          Add video
        </button>
      )}
      <VideoFileInput
        inputRef={inputRef}
        onFile={(f) => {
          setNotice(undefined);
          onChange(f);
          // Straight to the preview, with the comment box under it.
          setPreviewUrl(URL.createObjectURL(f));
        }}
        onTooBig={setNotice}
      />
      {notice && <VideoNotice message={notice} onClose={() => setNotice(undefined)} />}
      {previewUrl && file && (
        <VideoPlayer
          src={previewUrl}
          title="Video for this set"
          subtitle={`${formatBytes(file.size)} · uploads once the set is ticked`}
          onClose={closePreview}
          note={{ kind: 'draft', value: note, onChange: onNoteChange }}
          actions={
            <>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  closePreview();
                  inputRef.current?.click();
                }}
              >
                Change
              </button>
              <button
                type="button"
                className="ghost danger"
                onClick={() => {
                  closePreview();
                  onChange(undefined);
                }}
              >
                Remove
              </button>
            </>
          }
        />
      )}
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

function useEscape(onClose: () => void) {
  const ref = useRef(onClose);
  useEffect(() => {
    ref.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && ref.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/**
 * The comment under a video: typed with a clip not uploaded yet ('draft',
 * saved along with the set), edited on a logged set ('saved', has its own
 * Save), or just shown — to a coach ('read').
 */
type NoteMode =
  | { kind: 'draft'; value: string; onChange: (note: string) => void }
  | { kind: 'saved'; value: string; save: (note: string) => Promise<void> }
  | { kind: 'read'; value: string };

function VideoPlayer({
  src,
  title,
  subtitle,
  onClose,
  actions,
  note,
}: {
  src: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  actions?: React.ReactNode;
  note?: NoteMode;
}) {
  const [failed, setFailed] = useState(false);
  useEscape(onClose);

  return (
    <Overlay>
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="video-modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-head">
          <div>
            <strong>{title}</strong>
            {subtitle && <div className="muted video-modal-sub">{subtitle}</div>}
          </div>
          <button type="button" className="ghost small" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {failed ? (
          <p className="muted" style={{ padding: '1rem 0' }}>
            This browser can't play that video's format (iPhone HEVC clips often only play in
            Safari).{' '}
            <a href={src} download>
              Download it
            </a>{' '}
            instead.
          </p>
        ) : (
          <video src={src} controls autoPlay playsInline onError={() => setFailed(true)} />
        )}
        {note && <VideoNote note={note} />}
        {actions && <div className="video-modal-actions">{actions}</div>}
      </div>
    </div>
    </Overlay>
  );
}

const MAX_NOTE = 1000;

async function saveNote(setId: string, userId: string, note: string, onChanged?: () => void) {
  await api.setVideoNote(setId, userId, note);
  onChanged?.();
}

function VideoNote({ note }: { note: NoteMode }) {
  const [text, setText] = useState(note.value);
  /** What the server has — the player's copy of the set can be older than our own last save. */
  const [savedText, setSavedText] = useState(note.value);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | string>('idle');

  if (note.kind === 'read') {
    return note.value ? (
      <p className="video-note-read">
        <span className="muted">Lifter's comment</span>
        {note.value}
      </p>
    ) : null;
  }

  const value = note.kind === 'draft' ? note.value : text;
  const dirty = note.kind === 'saved' && text.trim() !== savedText.trim();

  async function save() {
    if (note.kind !== 'saved') return;
    setState('saving');
    try {
      await note.save(text);
      setSavedText(text);
      setState('saved');
    } catch (err) {
      setState((err as Error).message);
    }
  }

  return (
    <div className="video-note">
      <label htmlFor="video-note">Comment</label>
      <textarea
        id="video-note"
        rows={2}
        maxLength={MAX_NOTE}
        value={value}
        onChange={(e) => {
          if (note.kind === 'draft') note.onChange(e.target.value);
          else {
            setText(e.target.value);
            setState('idle');
          }
        }}
        placeholder="e.g. bar drifted forward on rep 3 — felt heavy off the chest"
      />
      {note.kind === 'saved' && (
        <div className="video-note-foot">
          <span className="muted">
            {state === 'saving'
              ? 'Saving…'
              : state === 'saved'
                ? 'Saved ✓'
                : state !== 'idle'
                  ? state
                  : 'Your coach can read this.'}
          </span>
          <button type="button" className="small" onClick={save} disabled={!dirty || state === 'saving'}>
            Save comment
          </button>
        </div>
      )}
    </div>
  );
}

/** Just the comment, for a clip already uploaded from the log form. */
export function VideoNoteDialog({
  note,
  onChange,
  onClose,
}: {
  note: string;
  onChange: (note: string) => void;
  onClose: () => void;
}) {
  useEscape(onClose);
  return (
    <Overlay>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="panel video-notice" role="dialog" aria-label="Video comment" onClick={(e) => e.stopPropagation()}>
          <strong>Video comment</strong>
          <p className="muted" style={{ margin: '.25rem 0 .5rem' }}>
            Saved with the set. Watch the video in History.
          </p>
          <VideoNote note={{ kind: 'draft', value: note, onChange }} />
          <button type="button" onClick={onClose} style={{ marginTop: '.6rem' }}>
            Done
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/** A small dialog for video problems (too big, upload failed) — readable on a phone. */
function VideoNotice({ message, onClose }: { message: string; onClose: () => void }) {
  useEscape(onClose);
  return (
    <Overlay>
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="panel video-notice" role="alertdialog" onClick={(e) => e.stopPropagation()}>
          <strong>Video</strong>
          <p>{message}</p>
          <button type="button" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
