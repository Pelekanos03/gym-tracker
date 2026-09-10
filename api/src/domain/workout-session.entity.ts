import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SessionStatus } from '../common/enums';
import { User } from './user.entity';
import { ProgramAssignment } from './program-assignment.entity';
import { ProgramDay } from './program-day.entity';
import { SetLog } from './set-log.entity';

/**
 * One training session a client actually did (or was scheduled to do).
 * This is the record a coach opens to "see what their client did".
 */
@Entity('workout_sessions')
export class WorkoutSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.sessions, {
    eager: true,
    onDelete: 'CASCADE',
  })
  client: User;

  /** Which assignment this belongs to (null for ad-hoc sessions). */
  @ManyToOne(() => ProgramAssignment, (a) => a.sessions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  assignment: ProgramAssignment | null;

  /** The planned day this session follows (null for ad-hoc sessions). */
  @ManyToOne(() => ProgramDay, { nullable: true, eager: true, onDelete: 'SET NULL' })
  programDay: ProgramDay | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', enum: SessionStatus, default: SessionStatus.COMPLETED })
  status: SessionStatus;

  @Column({ default: '' })
  notes: string;

  @OneToMany(() => SetLog, (set) => set.session, { cascade: true, eager: true })
  sets: SetLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Total weight moved in the session (kg). A simple, useful volume proxy. */
  totalVolume(): number {
    return (this.sets ?? [])
      .filter((s) => !s.isWarmup)
      .reduce((sum, s) => sum + s.weight * s.reps, 0);
  }
}
