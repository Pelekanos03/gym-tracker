import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ExerciseCategory } from '../common/enums';
import { User } from './user.entity';

/**
 * A movement in the exercise library (Back Squat, Bench Press, Barbell Row, ...).
 * Users pick from these when building a program, and log sets against them.
 *
 * Built-in exercises (the seeded library) have no owner and everyone sees
 * them. An exercise a user adds is theirs alone — it only shows up in their
 * own library, so one person's odd additions don't clutter everyone else's.
 */
@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', enum: ExerciseCategory })
  category: ExerciseCategory;

  /** Primary muscle group, free text for now e.g. "Quads", "Chest", "Back". */
  @Column({ name: 'primary_muscle' })
  primaryMuscle: string;

  /** One of the three competition lifts — used to highlight PRs for powerlifters. */
  @Column({ name: 'is_competition_lift', default: false })
  isCompetitionLift: boolean;

  /**
   * Set when its owner deleted their account but friends' programs or logs
   * still use it: it stays for them, but never joins the shared library.
   */
  @Column({ default: false })
  retired: boolean;

  /** Who added it; null = built-in, visible to everyone (unless retired). */
  @Column({ type: 'varchar', nullable: true })
  ownerId: string | null;

  /**
   * SET NULL rather than CASCADE: friends may have copied programs or logged
   * sets that use this exercise, so if its owner goes it becomes built-in
   * instead of vanishing from under them.
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerId' })
  owner: User | null;
}
