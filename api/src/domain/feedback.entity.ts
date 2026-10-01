import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

/** A note a tester sent from the app's "Send feedback" box. */
@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @Column({ type: 'text' })
  message: string;

  /** Which tab they were on, e.g. "stats" — helps make sense of "this is confusing". */
  @Column({ default: '' })
  page: string;

  /** Browser / phone, for "it looks broken on my phone". */
  @Column({ name: 'user_agent', default: '' })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
