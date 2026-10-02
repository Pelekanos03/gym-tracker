import { useCallback, useEffect, useRef, useState } from 'react';
import { api, attachmentUrl } from '../api';
import type { ChatContact, ChatMessage } from '../types';
import { formatShortDay, relativeDay, toDayString } from '../stats';

/** How often an open conversation checks for new messages. */
const POLL_MS = 4000;

const RELATION_LABEL = { friend: 'Friend', coach: 'Your coach', client: 'You coach them' } as const;

/**
 * Chat with friends and with your coach / clients. A list of everyone you
 * can message (latest message, unread count), then a conversation view.
 * New messages arrive by checking every few seconds while it's open.
 */
export function MessagesPanel({ meId, onRead }: { meId: string; onRead: () => void }) {
  const [contacts, setContacts] = useState<ChatContact[]>();
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState<ChatContact>();

  const loadContacts = useCallback(() => {
    api
      .chatContacts()
      .then((c) => {
        setContacts(c);
        setError(undefined);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    loadContacts();
    const t = window.setInterval(() => document.visibilityState === 'visible' && loadContacts(), 15_000);
    return () => window.clearInterval(t);
  }, [loadContacts]);

  if (open) {
    return (
      <Conversation
        meId={meId}
        contact={open}
        onBack={() => {
          setOpen(undefined);
          loadContacts();
          onRead();
        }}
        onRead={onRead}
      />
    );
  }

  return (
    <div className="panel">
      <h2>Messages</h2>
      {error && <div className="err">{error}</div>}
      {contacts && contacts.length === 0 && (
        <p className="muted">
          You can message your friends and your coach or clients. Add a friend from the Friends section to start
          chatting.
        </p>
      )}
      <div className="chat-contacts">
        {contacts?.map((c) => (
          <button key={c.user.id} type="button" className="chat-contact" onClick={() => setOpen(c)}>
            <span className="chat-avatar" aria-hidden>
              {initials(c.user.name)}
            </span>
            <span className="chat-contact-main">
              <span className="chat-contact-top">
                <strong>{c.user.name}</strong>
                {c.last && <span className="muted chat-time">{when(c.last.createdAt)}</span>}
              </span>
              <span className="chat-contact-bottom">
                <span className={`chat-preview${c.unread ? ' unread' : ''}`}>
                  {c.last ? `${c.last.fromMe ? 'You: ' : ''}${c.last.body}` : c.relations.map((r) => RELATION_LABEL[r]).join(' · ')}
                </span>
                {c.unread > 0 && <span className="tab-badge">{c.unread}</span>}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Conversation({
  meId,
  contact,
  onBack,
  onRead,
}: {
  meId: string;
  contact: ChatContact;
  onBack: () => void;
  onRead: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  /** A file picked with "+", sent along with the text. */
  const [file, setFile] = useState<File>();
  const [progress, setProgress] = useState<number>();
  const fileInput = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const other = contact.user.id;

  // First page, then keep checking for new ones.
  useEffect(() => {
    let stopped = false;
    async function refresh(first: boolean) {
      try {
        const page = await api.conversation(other);
        if (stopped) return;
        setMessages((prev) => {
          if (first) return page;
          // Keep older pages already loaded; add anything new.
          const known = new Set(prev.map((m) => m.id));
          const fresh = page.filter((m) => !known.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
        if (first) setHasOlder(page.length >= 50);
        onRead();
      } catch (err) {
        if (!stopped) setError((err as Error).message);
      }
    }
    refresh(true);
    const t = window.setInterval(() => document.visibilityState === 'visible' && refresh(false), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [other, onRead]);

  useEffect(() => {
    if (stickToBottom.current) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest) return;
    stickToBottom.current = false;
    const page = await api.conversation(other, oldest.createdAt).catch(() => []);
    setHasOlder(page.length >= 50);
    setMessages((prev) => [...page, ...prev]);
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if ((!body && !file) || sending) return;
    if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is ${formatSize(file.size)} — files can be up to ${MAX_FILE_MB} MB.`);
      return;
    }
    setSending(true);
    setError(undefined);
    try {
      const sent = file
        ? await api.sendAttachment(other, file, body, setProgress)
        : await api.sendMessage(other, body);
      stickToBottom.current = true;
      setMessages((prev) => [...prev, sent]);
      setText('');
      setFile(undefined);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
      setProgress(undefined);
    }
  }

  return (
    <div className="panel chat">
      <div className="chat-head">
        <button type="button" className="ghost small" onClick={onBack} aria-label="Back to messages">
          ‹ Back
        </button>
        <span className="chat-avatar" aria-hidden>
          {initials(contact.user.name)}
        </span>
        <div>
          <strong>{contact.user.name}</strong>
          <div className="muted chat-sub">{contact.relations.map((r) => RELATION_LABEL[r]).join(' · ')}</div>
        </div>
      </div>

      <div className="chat-thread" role="log" aria-live="polite">
        {hasOlder && (
          <button type="button" className="link-button" onClick={loadOlder}>
            Load earlier messages
          </button>
        )}
        {messages.length === 0 && <p className="muted chat-empty">No messages yet — say hi.</p>}
        {messages.map((m, i) => {
          const mine = m.fromId === meId;
          const day = toDayString(new Date(m.createdAt));
          const prevDay = i > 0 ? toDayString(new Date(messages[i - 1].createdAt)) : '';
          return (
            <div key={m.id}>
              {day !== prevDay && <div className="chat-day">{relativeDayLabel(day)}</div>}
              <div className={`chat-bubble ${mine ? 'mine' : 'theirs'}`}>
                {m.attachment && <Attachment messageId={m.id} attachment={m.attachment} />}
                {m.body && <span className="chat-text">{m.body}</span>}
                <span className="chat-meta">
                  {TIME.format(new Date(m.createdAt))}
                  {mine && m.readAt && ' · Seen'}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && <div className="err">{error}</div>}
      {file && (
        <div className="chat-pending">
          <span className="chat-file-icon" aria-hidden>
            {fileIcon(file.type, file.name)}
          </span>
          <span className="chat-file-name">{file.name}</span>
          <span className="muted">
            {progress !== undefined ? `${Math.round(progress * 100)}%` : formatSize(file.size)}
          </span>
          {!sending && (
            <button type="button" className="ghost small" onClick={() => setFile(undefined)} aria-label="Remove file">
              ✕
            </button>
          )}
        </div>
      )}
      <form className="chat-compose" onSubmit={send}>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept={ACCEPT}
          onChange={(e) => {
            const picked = e.target.files?.[0];
            e.target.value = ''; // picking the same file again still fires
            if (picked) {
              setFile(picked);
              setError(undefined);
            }
          }}
        />
        <button
          type="button"
          className="ghost chat-attach"
          onClick={() => fileInput.current?.click()}
          disabled={sending}
          title="Send a photo or document"
          aria-label="Attach a photo or document"
        >
          +
        </button>
        <textarea
          rows={1}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter makes a new line.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={file ? 'Add a message (optional)…' : `Message ${contact.user.name}…`}
          aria-label="Message"
        />
        <button disabled={sending || (!text.trim() && !file)}>{sending && file ? 'Sending…' : 'Send'}</button>
      </form>
    </div>
  );
}

/** Matches the server's limit (MAX_ATTACHMENT_MB) so a too-big file is caught before uploading. */
const MAX_FILE_MB = 25;

/** What the file picker offers — the same kinds the server accepts. */
const ACCEPT = [
  'image/*',
  '.heic',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.odt',
  '.ods',
  '.mp4',
  '.mov',
  '.webm',
  '.mp3',
  '.m4a',
  '.zip',
].join(',');

/** Photos show in the bubble; anything else is a card that opens or downloads the file. */
function Attachment({ messageId, attachment }: { messageId: string; attachment: NonNullable<ChatMessage['attachment']> }) {
  const url = attachmentUrl(messageId);
  if (/^image\/(jpeg|png|gif|webp)$/.test(attachment.type)) {
    return (
      <a href={url} target="_blank" rel="noopener" className="chat-image">
        <img src={url} alt={attachment.name} loading="lazy" />
      </a>
    );
  }
  return (
    <a href={url} className="chat-file" download={attachment.name}>
      <span className="chat-file-icon" aria-hidden>
        {fileIcon(attachment.type, attachment.name)}
      </span>
      <span className="chat-file-main">
        <span className="chat-file-name">{attachment.name}</span>
        <span className="chat-file-size">{formatSize(attachment.size)} · Download</span>
      </span>
    </a>
  );
}

function fileIcon(type: string, name: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return '📕';
  if (/sheet|excel|csv/.test(type)) return '📊';
  if (/presentation|powerpoint/.test(type)) return '📽️';
  if (/zip/.test(type)) return '🗜️';
  return '📄';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TIME = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** "18:42" today, "Yesterday", or "3 Oct". */
function when(iso: string): string {
  const day = toDayString(new Date(iso));
  const rel = relativeDay(day);
  if (rel === 'Today') return TIME.format(new Date(iso));
  if (rel === 'Yesterday') return rel;
  return formatShortDay(day);
}

function relativeDayLabel(day: string): string {
  const rel = relativeDay(day);
  return rel === 'Today' || rel === 'Yesterday' ? rel : formatShortDay(day);
}
