import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Links one coach to one client. A coach has many of these (their roster);
 * a client normally has one. Kept as its own class so we can later hang
 * extra data off the relationship (start date, billing, notes, status).
 */
@Entity('coaching_relationships')
@Unique(['coach', 'client'])
export class CoachingRelationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.clientLinks, {
    eager: true,
    onDelete: 'CASCADE',
  })
  coach: User;

  @ManyToOne(() => User, (user) => user.coachLinks, {
    eager: true,
    onDelete: 'CASCADE',
  })
  client: User;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
