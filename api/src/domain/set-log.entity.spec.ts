import { SetLog } from './set-log.entity';
import { WorkoutSession } from './workout-session.entity';
import { SetDrop } from './set-drop.entity';
import { SupersetPartner } from './superset-partner.entity';
import { SetType } from '../common/enums';

function set(weight: number, reps: number): SetLog {
  const s = new SetLog();
  s.weight = weight;
  s.reps = reps;
  return s;
}

describe('SetLog.estimatedOneRepMax (Epley formula)', () => {
  it('returns the weight itself for a single rep', () => {
    expect(set(100, 1).estimatedOneRepMax()).toBe(100);
  });

  it('estimates higher than the working weight for reps > 1', () => {
    const e1rm = set(100, 5).estimatedOneRepMax();
    expect(e1rm).toBeGreaterThan(100);
    expect(e1rm).toBeCloseTo(116.67, 1);
  });

  it('returns 0 for a zero or negative weight', () => {
    expect(set(0, 5).estimatedOneRepMax()).toBe(0);
    expect(set(-10, 5).estimatedOneRepMax()).toBe(0);
  });

  it('returns 0 for zero or negative reps', () => {
    expect(set(100, 0).estimatedOneRepMax()).toBe(0);
  });
});

describe('WorkoutSession.totalVolume', () => {
  it('excludes warm-ups but counts every other set type', () => {
    const session = new WorkoutSession();
    const working = set(100, 5); // 500
    const dropSet = set(80, 5); // 400 — still counts
    dropSet.setType = SetType.DROP_SET;
    const warmup = set(40, 10); // excluded
    warmup.setType = SetType.WARMUP;
    session.sets = [working, dropSet, warmup];
    expect(session.totalVolume()).toBe(900);
  });

  it('counts every drop of a drop set on top of its top set', () => {
    const session = new WorkoutSession();
    const dropSet = set(100, 8); // 800
    dropSet.setType = SetType.DROP_SET;
    dropSet.drops = [drop(80, 6), drop(60, 5)]; // 480 + 300
    session.sets = [dropSet];
    expect(session.totalVolume()).toBe(1580);
  });

  it('counts the partner exercise of a superset on top of its main set', () => {
    const session = new WorkoutSession();
    const superset = set(60, 10); // 600
    superset.setType = SetType.SUPERSET;
    const partner = new SupersetPartner();
    partner.weight = 20;
    partner.reps = 12; // 240
    superset.supersetPartners = [partner];
    session.sets = [superset];
    expect(session.totalVolume()).toBe(840);
  });
});

function drop(weight: number, reps: number): SetDrop {
  const d = new SetDrop();
  d.weight = weight;
  d.reps = reps;
  return d;
}
