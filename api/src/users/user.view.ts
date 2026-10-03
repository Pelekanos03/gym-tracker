import { User } from '../domain/user.entity';

/** Shape returned to callers — never leak the password hash. */
/** You, as you see yourself (your email and settings included). */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  weightReminder: 'off' | 'daily' | 'weekly';
  /**
   * Changes whenever the picture does (null = none, show the blank face).
   * Added to the picture's URL so a new one isn't hidden by the old cached one.
   */
  avatarVersion: string | null;
  /** Your privacy choices (see the privacy policy). */
  consents: { health: boolean; partners: boolean; ai: boolean };
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    weightReminder: user.weightReminder ?? 'off',
    avatarVersion: avatarVersion(user),
    consents: { health: !!user.healthConsentAt, partners: !!user.consentPartners, ai: !!user.consentAi },
  };
}

/** A short tag from the (random) stored file name — never the name itself. */
export function avatarVersion(user: User): string | null {
  return user.avatarFile ? user.avatarFile.slice(0, 8) : null;
}

/** Another person, as anyone else sees them: no email — that's private. */
export interface OtherUser {
  id: string;
  name: string;
}

export function toOtherUser(user: User): OtherUser {
  return { id: user.id, name: user.name };
}
