import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BlockStatus, SessionStatus } from '../common/enums';
import { User } from './user.entity';
import { Program } from './program.entity';
import { WorkoutSession } from './workout-session.entity';

/** A position in a program: week N, day M. */
export interface BlockSlot {
  week: number;
  day: number;
}

export type BlockDayStatus = 'DONE' | 'TODO';

export interface BlockDayProgress extends BlockSlot {
  programDayId: string;
  name: string;
  status: BlockDayStatus;
  /** When it was trained, if DONE. */
  doneOn: string | null;
}

/**
 * One run of a program by a user — "I'm doing the 5/3/1 Block now".
 *
 * Progress is deliberately not calendar-based: week 2 is simply what comes
 * after week 1, however long that took. Days can be trained in any order —
 * skipping one is just not training it. It's tracked by week/day *number*
 * rather than by ProgramDay id, because editing a program rebuilds its days — progress
 * shouldn't vanish because the user tweaked a weight mid-block.
 */
@Entity('training_blocks')
export class TrainingBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Program, { eager: true, onDelete: 'CASCADE' })
  program: Program;

  @Column({ type: 'varchar', enum: BlockStatus, default: BlockStatus.ACTIVE })
  status: BlockStatus;

  @Column({ name: 'started_on', type: 'date' })
  startedOn: string;

  @Column({ name: 'ended_on', type: 'date', nullable: true })
  endedOn: string | null;

  /** Sessions logged as part of this block. Loaded explicitly, not eagerly. */
  @OneToMany(() => WorkoutSession, (session) => session.block)
  sessions: WorkoutSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Every day of the program in training order, with where the user stands on it. */
  progress(): BlockDayProgress[] {
    return (this.program.days ?? []).map((day) => {
      const slot = { week: day.weekNumber, day: day.dayNumber };
      const session = (this.sessions ?? []).find(
        (s) =>
          s.status === SessionStatus.COMPLETED &&
          s.blockWeek === slot.week &&
          s.blockDay === slot.day,
      );
      return {
        ...slot,
        programDayId: day.id,
        name: day.name,
        status: (session ? 'DONE' : 'TODO') as BlockDayStatus,
        doneOn: session?.date ?? null,
      };
    });
  }

  /**
   * Where the user left off: the first day still to do after the furthest
   * day they've trained. Days they passed over count as skipped, so the
   * suggestion keeps moving forward. Falls back to any day still to do
   * (e.g. they jumped straight to the last week). A suggestion, not a rule.
   */
  nextDay(): BlockDayProgress | null {
    const days = this.progress();
    let furthestDone = -1;
    days.forEach((d, i) => {
      if (d.status === 'DONE') furthestDone = i;
    });
    return (
      days.slice(furthestDone + 1).find((d) => d.status === 'TODO') ??
      days.find((d) => d.status === 'TODO') ??
      null
    );
  }
}
