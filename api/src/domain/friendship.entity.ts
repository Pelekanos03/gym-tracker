import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { FriendshipStatus } from '../common/enums';
import { User } from './user.entity';

/**
 * A friend link between two users. Starts PENDING when one user requests
 * the other; becomes ACCEPTED once the addressee accepts. Friends can see
 * each other's programs and workout history, and copy each other's programs.
 */
@Entity('friendships')
@Unique(['requester', 'addressee'])
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  requester: User;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  addressee: User;

  @Column({ type: 'varchar', enum: FriendshipStatus, default: FriendshipStatus.PENDING })
  status: FriendshipStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'responded_at', type: 'datetime', nullable: true })
  respondedAt: Date | null;
}
