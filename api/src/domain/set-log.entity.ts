import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exercise } from './exercise.entity';
import { WorkoutSession } from './workout-session.entity';
import { SetDrop } from './set-drop.entity';
import { SupersetPartner } from './superset-partner.entity';
import { SetType } from '../common/enums';

/**
 * One set the user performed: weight x reps, optionally with an RPE.
 * The smallest unit of "what the user did", and the raw material for
 * every progress chart.
 */
@Entity('set_logs')
export class SetLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WorkoutSession, (session) => session.sets, {
    onDelete: 'CASCADE',
  })
  session: WorkoutSession;

  @ManyToOne(() => Exercise, { eager: true, onDelete: 'CASCADE' })
  exercise: Exercise;

  @Column({ name: 'set_number', default: 1 })
  setNumber: number;

  /** Load in kilograms. */
  @Column({ type: 'float' })
  weight: number;

  @Column()
  reps: number;

  @Column({ type: 'float', nullable: true })
  rpe: number | null;

  /** What role this set played — drives volume/progress rules, see SetType. */
  @Column({ name: 'set_type', type: 'varchar', enum: SetType, default: SetType.WORKING })
  setType: SetType;

  /** The weight drops that followed the top set. Only a DROP_SET has any. */
  @OneToMany(() => SetDrop, (drop) => drop.set, { cascade: true, eager: true })
  drops: SetDrop[];

  /** The other exercises done back-to-back with this one. Only a SUPERSET has any. */
  @OneToMany(() => SupersetPartner, (partner) => partner.set, { cascade: true, eager: true })
  supersetPartners: SupersetPartner[];

  /** Weight moved in this set (kg), including every drop or superset partner that went with it. */
  volume(): number {
    const extras = [...(this.drops ?? []), ...(this.supersetPartners ?? [])];
    return this.weight * this.reps + extras.reduce((sum, x) => sum + x.volume(), 0);
  }

  /**
   * Estimated one-rep max using the Epley formula.
   * Encapsulating the maths here keeps the progress service thin and
   * means every caller gets the same number.
   */
  estimatedOneRepMax(): number {
    if (this.reps <= 0 || this.weight <= 0) return 0;
    if (this.reps === 1) return this.weight;
    return Math.round(this.weight * (1 + this.reps / 30) * 100) / 100;
  }
}
