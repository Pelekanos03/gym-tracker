import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../common/enums';
import { CoachingRelationship } from './coaching-relationship.entity';
import { Program } from './program.entity';
import { WorkoutSession } from './workout-session.entity';

/**
 * A person using the platform. The same class models both coaches and clients;
 * the `role` decides which behaviour is allowed. This is a deliberate OOP choice:
 * one identity type, role-based behaviour, instead of two near-duplicate classes.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'varchar', enum: UserRole })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Relationships where this user is the coach. */
  @OneToMany(() => CoachingRelationship, (rel) => rel.coach)
  clientLinks: CoachingRelationship[];

  /** Relationships where this user is the client. */
  @OneToMany(() => CoachingRelationship, (rel) => rel.client)
  coachLinks: CoachingRelationship[];

  /** Programs this user authored (only meaningful for coaches). */
  @OneToMany(() => Program, (program) => program.coach)
  programs: Program[];

  /** Workout sessions this user performed (only meaningful for clients). */
  @OneToMany(() => WorkoutSession, (session) => session.client)
  sessions: WorkoutSession[];

  isCoach(): boolean {
    return this.role === UserRole.COACH;
  }

  isClient(): boolean {
    return this.role === UserRole.CLIENT;
  }
}
