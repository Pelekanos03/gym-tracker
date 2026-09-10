import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Program } from './program.entity';
import { User } from './user.entity';
import { WorkoutSession } from './workout-session.entity';

/**
 * Makes a program "live" for one client. This is the join between the coach's
 * template (Program) and the client's real training (WorkoutSession records).
 */
@Entity('program_assignments')
export class ProgramAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Program, (program) => program.assignments, {
    eager: true,
    onDelete: 'CASCADE',
  })
  program: Program;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  client: User;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  assignedBy: User;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => WorkoutSession, (session) => session.assignment)
  sessions: WorkoutSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
