import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Discipline, ExerciseCategory } from '../common/enums';

/**
 * A movement in the exercise library (Back Squat, Bench Press, Barbell Row, ...).
 * Users pick from these when building a program, and log sets against them.
 */
@Entity('exercises')
@Unique(['name'])
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', enum: ExerciseCategory })
  category: ExerciseCategory;

  @Column({ type: 'varchar', enum: Discipline, default: Discipline.BOTH })
  discipline: Discipline;

  /** Primary muscle group, free text for now e.g. "Quads", "Chest", "Back". */
  @Column({ name: 'primary_muscle' })
  primaryMuscle: string;

  /** One of the three competition lifts — used to highlight PRs for powerlifters. */
  @Column({ name: 'is_competition_lift', default: false })
  isCompetitionLift: boolean;
}
