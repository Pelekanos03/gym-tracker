import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

/** The built-in activities. Anything else is the user's own (e.g. "Padel"), stored as its name. */
export const CARDIO_ACTIVITIES = ['run', 'walk', 'bike', 'row', 'swim', 'elliptical', 'stairs', 'hiit', 'other'] as const;
export const MAX_ACTIVITY_LENGTH = 40;
/** How many of their own activities one person can keep. */
export const MAX_OWN_ACTIVITIES = 30;

/** "  padel   tennis " → "padel tennis". */
export function cleanActivity(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** One cardio session: what, when, how long — and optionally how far / how hard. */
@Entity('cardio_sessions')
export class CardioSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  /** Calendar day, YYYY-MM-DD. */
  @Column({ type: 'date' })
  date: string;

  /** A built-in key (see CARDIO_ACTIVITIES) or a user's own activity name. */
  @Column({ type: 'varchar' })
  activity: string;

  /** Whole seconds — minutes alone can't hold "25:30". */
  @Column({ name: 'duration_seconds' })
  durationSeconds: number;

  @Column({ name: 'distance_km', type: 'float', nullable: true })
  distanceKm: number | null;

  @Column({ name: 'avg_heart_rate', type: 'int', nullable: true })
  avgHeartRate: number | null;

  @Column({ type: 'int', nullable: true })
  calories: number | null;

  @Column({ type: 'text', default: '' })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
