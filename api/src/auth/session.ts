import { randomBytes } from 'crypto';
import { CookieOptions } from 'express';

/** The httpOnly cookie that carries the signed session token. */
export const SESSION_COOKIE = 'gym_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const isProduction = process.env.NODE_ENV === 'production';

/**
 * JWT signing secret. Production must set JWT_SECRET (a restart would
 * otherwise log everyone out, and a guessable secret lets anyone forge a
 * session). Dev falls back to a per-process random one.
 */
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProduction) {
    throw new Error('JWT_SECRET must be set to at least 32 random characters in production');
  }
  return (devSecret ??= randomBytes(32).toString('hex'));
}
let devSecret: string | undefined;

/**
 * httpOnly: page scripts can't read it (an XSS can't steal it).
 * SameSite=Lax: other sites can't make the browser send it on a
 * POST/PATCH/DELETE, which is what makes the API CSRF-safe.
 * Secure: HTTPS only, once deployed (COOKIE_SECURE=false to test prod over plain http).
 */
export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction && process.env.COOKIE_SECURE !== 'false',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}

/** What the guard puts on the request once the cookie checks out. */
export interface SessionUser {
  id: string;
}
