import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * The workout someone is in the middle of logging — saved as they go, so
 * closing the app, a reload or a dead phone battery doesn't lose their
 * sets. One per user; deleted once the session is logged.
 */
@Entity('workout_drafts')
export class WorkoutDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  /** The log form's state as JSON (exercises, sets, ticks, date, notes, planned day). */
  @Column({ type: 'text' })
  data: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
