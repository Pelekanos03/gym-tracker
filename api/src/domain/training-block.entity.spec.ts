import { TrainingBlock } from './training-block.entity';
import { Program } from './program.entity';
import { ProgramDay } from './program-day.entity';
import { WorkoutSession } from './workout-session.entity';
import { SessionStatus } from '../common/enums';

function day(week: number, dayNumber: number): ProgramDay {
  const d = new ProgramDay();
  d.id = `w${week}d${dayNumber}`;
  d.weekNumber = week;
  d.dayNumber = dayNumber;
  d.name = `W${week}D${dayNumber}`;
  return d;
}

function session(week: number, dayNumber: number, status = SessionStatus.COMPLETED): WorkoutSession {
  const s = new WorkoutSession();
  s.blockWeek = week;
  s.blockDay = dayNumber;
  s.status = status;
  s.date = '2026-09-29';
  return s;
}

/** A 2-week, 2-day block. */
function block(sessions: WorkoutSession[] = []): TrainingBlock {
  const program = new Program();
  program.days = [day(1, 1), day(1, 2), day(2, 1), day(2, 2)];
  const b = new TrainingBlock();
  b.program = program;
  b.sessions = sessions;
  return b;
}

const statuses = (b: TrainingBlock) => b.progress().map((d) => d.status);

describe('TrainingBlock progress', () => {
  it('starts with every day to do and suggests the first one', () => {
    const b = block();
    expect(statuses(b)).toEqual(['TODO', 'TODO', 'TODO', 'TODO']);
    expect(b.nextDay()?.programDayId).toBe('w1d1');
  });

  it('marks days done from sessions, in any order', () => {
    const b = block([session(2, 1)]);
    expect(statuses(b)).toEqual(['TODO', 'TODO', 'DONE', 'TODO']);
  });

  it('ignores sessions that were not completed', () => {
    const b = block([session(1, 1, SessionStatus.SKIPPED)]);
    expect(statuses(b)[0]).toBe('TODO');
  });

  it('continues after the furthest day done, passing over skipped days', () => {
    // Trained W1D1, skipped W1D2, trained W2D1 -> carry on with W2D2, not W1D2.
    const b = block([session(1, 1), session(2, 1)]);
    expect(b.nextDay()?.programDayId).toBe('w2d2');
  });

  it('falls back to an earlier day once everything after is done', () => {
    const b = block([session(2, 2)]);
    expect(b.nextDay()?.programDayId).toBe('w1d1');
  });

  it('has no next day once every day is done', () => {
    const b = block([session(1, 1), session(1, 2), session(2, 1), session(2, 2)]);
    expect(b.nextDay()).toBeNull();
  });
});
