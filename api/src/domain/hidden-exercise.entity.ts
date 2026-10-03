import { Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Exercise } from './exercise.entity';
import { User } from './user.entity';

/**
 * A built-in exercise someone took out of their own library ("I never do
 * Face Pulls"). Built-ins are shared, so they can't be deleted — just
 * hidden for that one user. Their past sets and programs keep using it.
 */
@Entity('hidden_exercises')
@Unique(['user', 'exercise'])
export class HiddenExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Exercise, { onDelete: 'CASCADE' })
  exercise: Exercise;
}
