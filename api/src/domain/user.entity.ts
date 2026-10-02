import { Exclude } from 'class-transformer';
import { DATETIME } from '../database/column-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Program } from './program.entity';
import { WorkoutSession } from './workout-session.entity';

/**
 * A person using the platform. Everyone is a peer — there is no coach/client
 * split. Users become friends, build their own programs, log their own
 * workouts, and can copy a friend's program into their own.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Private. @Exclude keeps it out of every nested object in API responses
   * (a program's owner, a session's user…); the few places that should
   * show it — your own account — build their response explicitly.
   */
  @Exclude()
  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  /**
   * Store a hash, never the raw password. `@Exclude` keeps it out of every
   * JSON response via the global ClassSerializerInterceptor.
   */
  @Exclude()
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Stamped into every session token. Bumping it (password change or
   * reset) makes every existing session — on every device — invalid.
   */
  @Exclude()
  @Column({ name: 'token_version', default: 0 })
  tokenVersion: number;

  /** When they accepted the terms & privacy policy at sign-up. */
  @Exclude()
  @Column({ name: 'accepted_terms_at', type: DATETIME, nullable: true })
  acceptedTermsAt: Date | null;

  /** In-app reminder to log body weight: 'off', 'daily' or 'weekly'. */
  @Column({ name: 'weight_reminder', type: 'varchar', default: 'off' })
  weightReminder: 'off' | 'daily' | 'weekly';

  /**
   * Their own cardio activities ("Padel"), shown as extra chips next to the
   * built-in ones. Personal: only served to them, and never sent with the
   * user object that friends and coaches see.
   */
  @Exclude()
  @Column({ name: 'cardio_activities', type: 'simple-json', default: '[]' })
  cardioActivities: string[];

  /** Programs this user owns (authored themselves, or copied from a friend). */
  @OneToMany(() => Program, (program) => program.owner)
  programs: Program[];

  /** Workout sessions this user logged. */
  @OneToMany(() => WorkoutSession, (session) => session.user)
  sessions: WorkoutSession[];
}
