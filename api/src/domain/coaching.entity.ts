import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CoachingStatus } from '../common/enums';
import { User } from './user.entity';

/**
 * An elevated permission layered on top of an existing friendship: the coach
 * gets to see the client's workout history and programs, which a plain
 * friend can't (a plain friend only sees progress). It never grants the
 * coach visibility into the client's own friends list.
 *
 * Starts PENDING when the prospective coach requests it; becomes ACCEPTED
 * only once the client agrees — mirrors the friend-request flow, but the
 * roles aren't symmetric (only the client may accept/decline).
 */
@Entity('coachings')
@Unique(['coach', 'client'])
export class Coaching {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  coach: User;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  client: User;

  @Column({ type: 'varchar', enum: CoachingStatus, default: CoachingStatus.PENDING })
  status: CoachingStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'responded_at', type: 'datetime', nullable: true })
  respondedAt: Date | null;
}
