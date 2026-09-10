import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Discipline } from '../common/enums';
import { User } from './user.entity';
import { ProgramDay } from './program-day.entity';
import { ProgramAssignment } from './program-assignment.entity';

/**
 * A training plan authored by a coach: an ordered set of days, each with
 * prescribed exercises. A program is a template — it becomes "live" for a
 * client through a ProgramAssignment.
 */
@Entity('programs')
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: '' })
  description: string;

  @Column({ type: 'varchar', enum: Discipline, default: Discipline.BOTH })
  discipline: Discipline;

  @Column({ name: 'length_weeks', default: 4 })
  lengthWeeks: number;

  @ManyToOne(() => User, (user) => user.programs, {
    eager: true,
    onDelete: 'CASCADE',
  })
  coach: User;

  @OneToMany(() => ProgramDay, (day) => day.program, {
    cascade: true,
    eager: true,
  })
  days: ProgramDay[];

  @OneToMany(() => ProgramAssignment, (assignment) => assignment.program)
  assignments: ProgramAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
