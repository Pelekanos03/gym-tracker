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
import { TrainingBlock } from './training-block.entity';

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

  /** The training block this session was logged as part of, if any. */
  @ManyToOne(() => TrainingBlock, (block) => block.sessions, { nullable: true, onDelete: 'SET NULL' })
  block: TrainingBlock | null;

  /**
   * Which week/day of the block this session covered. Stored as numbers,
   * not a ProgramDay link, so progress survives the program being edited.
   */
  @Column({ name: 'block_week', type: 'int', nullable: true })
  blockWeek: number | null;

  @Column({ name: 'block_day', type: 'int', nullable: true })
  blockDay: number | null;

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
   * warm-ups — drop sets and supersets (including each drop and superset
   * partner) are real working volume too.
   */
  totalVolume(): number {
    return (this.sets ?? [])
      .filter((s) => s.setType !== SetType.WARMUP)
      .reduce((sum, s) => sum + s.volume(), 0);
  }
}
