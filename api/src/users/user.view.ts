import { User } from '../domain/user.entity';

/** Shape returned to callers — never leak the password hash. */
/** You, as you see yourself (your email and settings included). */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  weightReminder: 'off' | 'daily' | 'weekly';
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    weightReminder: user.weightReminder ?? 'off',
  };
}

/** Another person, as anyone else sees them: no email — that's private. */
export interface OtherUser {
  id: string;
  name: string;
}

export function toOtherUser(user: User): OtherUser {
  return { id: user.id, name: user.name };
}
