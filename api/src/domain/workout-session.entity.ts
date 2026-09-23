import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SessionStatus, SetType } from '../common/enums';
import { User } from './user.entity';
import { ProgramDay } from './program-day.entity';
import { SetLog } from './set-log.entity';

/**
 * One training session a user actually did (or was scheduled to do).
 * This is the record a friend opens to "see what they did".
 */
@Entity('workout_sessions')
export class WorkoutSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.sessions, {
    eager: true,
    onDelete: 'CASCADE',
  })
  user: User;

  /** The planned day (from one of this user's own programs) this session follows, if any. */
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

  /**
   * Total weight moved in the session (kg). Everything counts except
   * warm-ups — drop sets and supersets are real working volume too.
   */
  totalVolume(): number {
    return (this.sets ?? [])
      .filter((s) => s.setType !== SetType.WARMUP)
      .reduce((sum, s) => sum + s.weight * s.reps, 0);
  }
}
