import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from './user.entity';

/** One body-weight reading. At most one per user per day — logging again that day overwrites it. */
@Entity('body_weight_entries')
@Unique(['user', 'date'])
export class BodyWeightEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  /** Calendar day, YYYY-MM-DD. */
  @Column({ type: 'date' })
  date: string;

  /** Kilograms. */
  @Column({ type: 'float' })
  weight: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
