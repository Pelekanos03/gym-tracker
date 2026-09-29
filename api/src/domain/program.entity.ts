import {
  AfterLoad,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ProgramDay } from './program-day.entity';

/**
 * A reusable training template: an ordered set of days, each with
 * prescribed exercises. Every user owns their own programs — built from
 * scratch, or copied from a friend's.
 */
@Entity('programs')
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: '' })
  description: string;

  @Column({ name: 'length_weeks', default: 4 })
  lengthWeeks: number;

  @ManyToOne(() => User, (user) => user.programs, {
    eager: true,
    onDelete: 'CASCADE',
  })
  owner: User;

  @OneToMany(() => ProgramDay, (day) => day.program, {
    cascade: true,
    eager: true,
  })
  days: ProgramDay[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * The database hands relations back in no particular order, so put the
   * days in training order (week, then day) every time a program is loaded.
   */
  @AfterLoad()
  sortDays(): void {
    this.days?.sort((a, b) => a.weekNumber - b.weekNumber || a.dayNumber - b.dayNumber);
  }
}
