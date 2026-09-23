import { SetLog } from './set-log.entity';
import { WorkoutSession } from './workout-session.entity';
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
});
