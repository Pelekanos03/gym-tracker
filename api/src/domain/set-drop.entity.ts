import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SetLog } from './set-log.entity';

/**
 * One drop within a drop set: after the top set, the user strips weight and
 * keeps going. A DROP_SET SetLog holds the top set; each drop that follows
 * is one of these, in order.
 */
@Entity('set_drops')
export class SetDrop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SetLog, (set) => set.drops, { onDelete: 'CASCADE' })
  set: SetLog;

  /** 1 = first drop after the top set, 2 = the one after that, … */
  @Column({ name: 'order_index' })
  orderIndex: number;

  /** Load in kilograms after the drop. */
  @Column({ type: 'float' })
  weight: number;

  @Column()
  reps: number;

  volume(): number {
    return this.weight * this.reps;
  }
}
