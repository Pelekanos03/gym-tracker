import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * What someone agreed to (or withdrew), and when, under which version of
 * the privacy policy. Kept as a history so consent can be proven (GDPR
 * art. 7(1)); the user's current choice is also on the user row.
 */
export type ConsentPurpose = 'health' | 'partners' | 'ai';

@Entity('consent_events')
@Index('IDX_consent_events_user_created', ['user', 'createdAt'])
export class ConsentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  /** health = storing health data to run the app; partners = sharing with partners; ai = AI training. */
  @Column({ type: 'varchar' })
  purpose: ConsentPurpose;

  @Column()
  granted: boolean;

  /** The privacy policy version shown when the choice was made. */
  @Column({ name: 'policy_version', type: 'varchar' })
  policyVersion: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
