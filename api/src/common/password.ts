import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Minimal password hashing with Node's built-in scrypt — no external dependency.
 * Format stored in the DB: "<saltHex>:<hashHex>".
 *
 * For production you'd typically reach for argon2 or bcrypt, but this is safe,
 * standard-library, and enough to learn with.
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(plain, Buffer.from(saltHex, 'hex'), 64);
  return timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}
