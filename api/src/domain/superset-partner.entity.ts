import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Exercise } from './exercise.entity';
import { SetLog } from './set-log.entity';

/**
 * The other exercise done back-to-back with a SUPERSET set, e.g. bench
 * press paired with a row. The SUPERSET SetLog holds the first exercise;
 * each partner is one of these, in order.
 */
@Entity('superset_partners')
export class SupersetPartner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SetLog, (set) => set.supersetPartners, { onDelete: 'CASCADE' })
  set: SetLog;

  @ManyToOne(() => Exercise, { eager: true, onDelete: 'CASCADE' })
  exercise: Exercise;

  /** 1 = first exercise after the main one, 2 = the one after that, … */
  @Column({ name: 'order_index' })
  orderIndex: number;

  /** Load in kilograms. */
  @Column({ type: 'float' })
  weight: number;

  @Column()
  reps: number;

  volume(): number {
    return this.weight * this.reps;
  }
}
