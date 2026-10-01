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
