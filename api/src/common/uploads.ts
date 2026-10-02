import { mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { basename, extname, join, resolve } from 'path';

/**
 * Where uploaded set videos live on disk. Never served as static files:
 * GET /api/set-logs/:id/video streams one after checking who's asking.
 */
export const VIDEO_DIR = resolve(process.env.UPLOADS_DIR ?? 'uploads', 'videos');

/**
 * Largest video accepted, in MB (MAX_VIDEO_MB, default 500 — a short 4K
 * clip). Set 100 when sharing through a free Cloudflare tunnel, which
 * refuses bigger uploads.
 */
export const MAX_VIDEO_MB = Number(process.env.MAX_VIDEO_MB ?? 500);
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

mkdirSync(VIDEO_DIR, { recursive: true });

/**
 * The stored file's extension decides the Content-Type it's served with,
 * so it must never come from the uploader unchecked — "clip.html" sent
 * as video/mp4 would otherwise be served back as a web page (XSS).
 */
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.3gp', '.mkv', '.avi']);

export function safeVideoExtension(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext) ? ext : '.mp4';
}

export function videoPath(file: string): string {
  return join(VIDEO_DIR, basename(file));
}

/** Best-effort delete; a file that's already gone is fine. */
export async function removeVideoFile(file: string | null | undefined): Promise<void> {
  if (!file) return;
  await unlink(join(VIDEO_DIR, basename(file))).catch(() => undefined);
}

/**
 * Files sent in chat. Like videos, never served statically: GET
 * /api/messages/:id/attachment streams one to the two people in that chat.
 */
export const CHAT_DIR = resolve(process.env.UPLOADS_DIR ?? 'uploads', 'chat');

/** Largest chat attachment, in MB (MAX_ATTACHMENT_MB, default 25). */
export const MAX_ATTACHMENT_MB = Number(process.env.MAX_ATTACHMENT_MB ?? 25);
export const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024;

mkdirSync(CHAT_DIR, { recursive: true });

/**
 * What can be sent, by extension → the Content-Type it's served with. The
 * type comes from this list, never from the uploader, so nothing can be
 * served back as a web page. Images show in the chat; the rest download.
 */
const ATTACHMENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.zip': 'application/zip',
};

/** The extension and served type for an upload, or null if that kind of file isn't allowed. */
export function attachmentKind(originalName: string): { ext: string; type: string } | null {
  const ext = extname(originalName).toLowerCase();
  const type = ATTACHMENT_TYPES[ext];
  return type ? { ext, type } : null;
}

/** Shown inline in the chat (and served inline); everything else downloads. */
export const INLINE_ATTACHMENT = /^image\/(jpeg|png|gif|webp)$/;

export function attachmentPath(file: string): string {
  return join(CHAT_DIR, basename(file));
}

export async function removeAttachmentFile(file: string | null | undefined): Promise<void> {
  if (!file) return;
  await unlink(join(CHAT_DIR, basename(file))).catch(() => undefined);
}
