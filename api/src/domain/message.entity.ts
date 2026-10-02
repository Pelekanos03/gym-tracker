import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DATETIME } from '../database/column-types';
import { User } from './user.entity';

/** One chat message between two people who are friends, or coach and client. */
@Entity('messages')
@Index(['senderId', 'recipientId', 'createdAt'])
@Index(['recipientId', 'readAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'uuid' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ type: 'text' })
  body: string;

  /** A file sent with the message (stored name on disk); the message text may then be empty. */
  @Column({ name: 'attachment_file', type: 'varchar', nullable: true })
  attachmentFile: string | null;

  /** The file's name as the sender had it, for showing and downloading. */
  @Column({ name: 'attachment_name', type: 'varchar', nullable: true })
  attachmentName: string | null;

  /** The Content-Type it's served with (from the extension allow-list, not the uploader). */
  @Column({ name: 'attachment_type', type: 'varchar', nullable: true })
  attachmentType: string | null;

  @Column({ name: 'attachment_size', type: 'int', nullable: true })
  attachmentSize: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** When the recipient opened the conversation; null = unread. */
  @Column({ name: 'read_at', type: DATETIME, nullable: true })
  readAt: Date | null;
}
