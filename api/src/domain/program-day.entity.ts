import {
  AfterLoad,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Program } from './program.entity';
import { ProgramExercise } from './program-exercise.entity';

/**
 * One training day inside a program, e.g. Week 1 / Day 2 "Heavy Bench".
 * Ordering is explicit via weekNumber + dayNumber so the user always
 * knows what comes next.
 */
@Entity('program_days')
export class ProgramDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Program, (program) => program.days, { onDelete: 'CASCADE' })
  program: Program;

  @Column({ name: 'week_number', default: 1 })
  weekNumber: number;

  @Column({ name: 'day_number', default: 1 })
  dayNumber: number;

  @Column({ default: 'Training Day' })
  name: string;

  @OneToMany(() => ProgramExercise, (pe) => pe.programDay, {
    cascade: true,
    eager: true,
  })
  exercises: ProgramExercise[];

  /** Exercises in the order they're done that day, however the database returned them. */
  @AfterLoad()
  sortExercises(): void {
    this.exercises?.sort((a, b) => a.orderIndex - b.orderIndex);
  }
}
