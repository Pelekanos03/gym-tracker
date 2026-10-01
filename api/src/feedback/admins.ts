import { normalizeEmail } from '../users/users.service';

/**
 * ADMIN_EMAILS (comma-separated) — accounts that can read the feedback
 * testers send. Nothing else is admin-only yet.
 */
export function isAdmin(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  return admins.includes(normalizeEmail(email));
}
