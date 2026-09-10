import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exercise } from './exercise.entity';
import { ProgramDay } from './program-day.entity';

/**
 * A single prescribed line on a training day:
 *   "Back Squat — 5 sets x 3 reps @ RPE 8" or "@ 80% 1RM".
 * The client will log actual sets against the same Exercise.
 */
@Entity('program_exercises')
export class ProgramExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProgramDay, (day) => day.exercises, { onDelete: 'CASCADE' })
  programDay: ProgramDay;

  @ManyToOne(() => Exercise, { eager: true, onDelete: 'CASCADE' })
  exercise: Exercise;

  /** Position of this exercise within the day (1 = first). */
  @Column({ name: 'order_index', default: 1 })
  orderIndex: number;

  @Column({ name: 'target_sets', default: 3 })
  targetSets: number;

  @Column({ name: 'target_reps', default: 5 })
  targetReps: number;

  /** Rate of Perceived Exertion target, 1-10. Null when the coach prescribes % instead. */
  @Column({ name: 'target_rpe', type: 'float', nullable: true })
  targetRpe: number | null;

  /** Percentage of one-rep-max target. Null when the coach prescribes RPE instead. */
  @Column({ name: 'target_percent_1rm', type: 'float', nullable: true })
  targetPercent1rm: number | null;

  @Column({ default: '' })
  notes: string;
}
