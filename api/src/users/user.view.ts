import { User } from '../domain/user.entity';

/** Shape returned to clients — never leak the password hash. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
