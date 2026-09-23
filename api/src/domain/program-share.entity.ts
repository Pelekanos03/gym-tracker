import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Program } from './program.entity';
import { User } from './user.entity';

/**
 * Shares one of your programs with a friend, without handing over an
 * editable copy — the program stays yours. The friend can view it and log
 * workouts against it (pick its days from "Follow a plan" the same as
 * their own programs), but can't edit it or make it independently theirs.
 * This is what replaced the old "copy a friend's program" flow, which made
 * it trivial to walk off with a coach's paid program for free; copying is
 * now something only a coach can do, deliberately, to their own client.
 */
@Entity('program_shares')
@Unique(['program', 'sharedWith'])
export class ProgramShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Program, { eager: true, onDelete: 'CASCADE' })
  program: Program;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  sharedWith: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
