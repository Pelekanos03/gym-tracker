import 'reflect-metadata';
import { DataSource, IsNull } from 'typeorm';
import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { dataSourceOptions } from './data-source-options';
import { Exercise } from '../domain/exercise.entity';
import { User } from '../domain/user.entity';
import { Friendship } from '../domain/friendship.entity';
import { Coaching } from '../domain/coaching.entity';
import { Program } from '../domain/program.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { ProgramExercise } from '../domain/program-exercise.entity';
import { ProgramShare } from '../domain/program-share.entity';
import { WorkoutSession } from '../domain/workout-session.entity';
import { SetLog } from '../domain/set-log.entity';
import {
  CoachingStatus,
  ExerciseCategory,
  FriendshipStatus,
  SessionStatus,
  SetType,
} from '../common/enums';
import { hashPassword } from '../common/password';

/**
 * Populates a fresh database with a starter exercise library, two demo
 * users who are already friends, and a sample program so you can see the
 * "copy a friend's program" flow immediately.
 *
 * Run with:  npm run seed --workspace api
 */


async function run() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--i-know-this-is-production')) {
    throw new Error(
      'Refusing to seed demo users/workouts into production. (Built-in exercises are added automatically on startup.)',
    );
  }
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const exerciseRepo = dataSource.getRepository(Exercise);
  for (const data of BUILT_IN_EXERCISES) {
    const exists = await exerciseRepo.findOne({ where: { name: data.name, ownerId: IsNull() } });
    if (!exists) await exerciseRepo.save(exerciseRepo.create(data));
  }
  console.log(`Seeded ${BUILT_IN_EXERCISES.length} exercises.`);

  const userRepo = dataSource.getRepository(User);
  const demoUsers = [
    { name: 'Alex Rivera', email: 'alex@example.com' },
    { name: 'Sam Torres', email: 'sam@example.com' },
    { name: 'Jordan Lee', email: 'jordan@example.com' },
    { name: 'Priya Nair', email: 'priya@example.com' },
  ];
  const users: User[] = [];
  for (const data of demoUsers) {
    let user = await userRepo.findOne({ where: { email: data.email } });
    if (!user) {
      user = await userRepo.save(
        userRepo.create({ ...data, passwordHash: hashPassword('password123') }),
      );
      console.log(`Created user ${data.email} (password: password123)`);
    }
    users.push(user);
  }
  const [alex, sam, jordan, priya] = users;

  const friendshipRepo = dataSource.getRepository(Friendship);
  async function friendIfMissing(
    requester: User,
    addressee: User,
    status: FriendshipStatus = FriendshipStatus.ACCEPTED,
  ) {
    const existing = await friendshipRepo.findOne({
      where: [
        { requester: { id: requester.id }, addressee: { id: addressee.id } },
        { requester: { id: addressee.id }, addressee: { id: requester.id } },
      ],
    });
    if (existing) return;
    await friendshipRepo.save(
      friendshipRepo.create({
        requester,
        addressee,
        status,
        respondedAt: status === FriendshipStatus.ACCEPTED ? new Date() : null,
      }),
    );
    console.log(
      status === FriendshipStatus.ACCEPTED
        ? `Made ${requester.name} and ${addressee.name} friends.`
        : `${requester.name} sent ${addressee.name} a friend request.`,
    );
  }

  await friendIfMissing(alex, sam);
  await friendIfMissing(alex, jordan);
  await friendIfMissing(sam, priya);
  await friendIfMissing(jordan, priya, FriendshipStatus.PENDING);

  // --- Coaching: an elevated permission layered on an existing friendship
  // (coach sees history + programs; a plain friend only sees progress).
  const coachingRepo = dataSource.getRepository(Coaching);
  async function coachIfMissing(
    coach: User,
    client: User,
    status: CoachingStatus = CoachingStatus.ACCEPTED,
  ) {
    const existing = await coachingRepo.findOne({
      where: { coach: { id: coach.id }, client: { id: client.id } },
    });
    if (existing) return;
    await coachingRepo.save(
      coachingRepo.create({
        coach,
        client,
        status,
        respondedAt: status === CoachingStatus.ACCEPTED ? new Date() : null,
      }),
    );
    console.log(
      status === CoachingStatus.ACCEPTED
        ? `${coach.name} is now coaching ${client.name}.`
        : `${coach.name} asked to coach ${client.name}.`,
    );
  }

  await coachIfMissing(alex, sam);
  await coachIfMissing(sam, priya, CoachingStatus.PENDING);

  const programRepo = dataSource.getRepository(Program);
  const byName = new Map((await exerciseRepo.find()).map((e) => [e.name, e]));

  function day(weekNumber: number, dayNumber: number, name: string, lines: Partial<ProgramExercise>[]): ProgramDay {
    const d = new ProgramDay();
    d.weekNumber = weekNumber;
    d.dayNumber = dayNumber;
    d.name = name;
    d.exercises = lines.map((line, i) =>
      Object.assign(new ProgramExercise(), { orderIndex: i + 1, ...line }),
    );
    return d;
  }

  async function createProgramIfMissing(
    owner: User,
    name: string,
    description: string,
    lengthWeeks: number,
    days: ProgramDay[],
  ) {
    const existing = await programRepo.findOne({ where: { name, owner: { id: owner.id } } });
    if (existing) return existing;
    const program = new Program();
    program.name = name;
    program.description = description;
    program.lengthWeeks = lengthWeeks;
    program.owner = owner;
    program.days = days;
    const saved = await programRepo.save(program);
    console.log(`Created program "${name}" for ${owner.name}.`);
    return saved;
  }

  await createProgramIfMissing(alex, 'Starter Strength', 'A simple full-body strength template.', 4, [
    day(1, 1, 'Full Body A', [
      { exercise: byName.get('Back Squat'), targetSets: 5, targetReps: 5, targetRpe: 7 },
      { exercise: byName.get('Bench Press'), targetSets: 5, targetReps: 5, targetRpe: 7 },
      { exercise: byName.get('Barbell Row'), targetSets: 4, targetReps: 8 },
    ]),
  ]);

  const fiveThreeOne = await createProgramIfMissing(
    alex,
    '5/3/1 Block',
    'Classic 3-day powerlifting split, one main lift per day.',
    4,
    [
      day(1, 1, 'Squat Day', [
        { exercise: byName.get('Back Squat'), targetSets: 5, targetReps: 5, targetRpe: 8 },
        { exercise: byName.get('Front Squat'), targetSets: 3, targetReps: 8, targetRpe: 6 },
        { exercise: byName.get('Leg Curl'), targetSets: 3, targetReps: 12 },
      ]),
      day(1, 2, 'Bench Day', [
        { exercise: byName.get('Bench Press'), targetSets: 5, targetReps: 5, targetRpe: 8 },
        { exercise: byName.get('Overhead Press'), targetSets: 3, targetReps: 8, targetRpe: 6 },
        { exercise: byName.get('Triceps Pushdown'), targetSets: 3, targetReps: 12 },
      ]),
      day(1, 3, 'Deadlift Day', [
        { exercise: byName.get('Deadlift'), targetSets: 5, targetReps: 3, targetRpe: 8 },
        { exercise: byName.get('Romanian Deadlift'), targetSets: 3, targetReps: 8, targetRpe: 6 },
        { exercise: byName.get('Barbell Row'), targetSets: 4, targetReps: 8 },
      ]),
    ],
  );

  const ppl = await createProgramIfMissing(
    sam,
    'Push Pull Legs',
    'A 3-day bodybuilding split for hypertrophy.',
    6,
    [
      day(1, 1, 'Push', [
        { exercise: byName.get('Bench Press'), targetSets: 4, targetReps: 8 },
        { exercise: byName.get('Incline Dumbbell Press'), targetSets: 3, targetReps: 10 },
        { exercise: byName.get('Overhead Press'), targetSets: 3, targetReps: 10 },
        { exercise: byName.get('Lateral Raise'), targetSets: 3, targetReps: 15 },
        { exercise: byName.get('Triceps Pushdown'), targetSets: 3, targetReps: 12 },
      ]),
      day(1, 2, 'Pull', [
        { exercise: byName.get('Barbell Row'), targetSets: 4, targetReps: 8 },
        { exercise: byName.get('Pull-Up'), targetSets: 3, targetReps: 10 },
        { exercise: byName.get('Lat Pulldown'), targetSets: 3, targetReps: 12 },
        { exercise: byName.get('Face Pull'), targetSets: 3, targetReps: 15 },
        { exercise: byName.get('Dumbbell Curl'), targetSets: 3, targetReps: 12 },
      ]),
      day(1, 3, 'Legs', [
        { exercise: byName.get('Back Squat'), targetSets: 4, targetReps: 8 },
        { exercise: byName.get('Leg Press'), targetSets: 3, targetReps: 12 },
        { exercise: byName.get('Romanian Deadlift'), targetSets: 3, targetReps: 10 },
        { exercise: byName.get('Leg Extension'), targetSets: 3, targetReps: 15 },
        { exercise: byName.get('Calf Raise'), targetSets: 4, targetReps: 15 },
      ]),
    ],
  );

  const jordanStarter = await createProgramIfMissing(
    jordan,
    'Full Body Basics',
    'Three full-body sessions a week to build the habit.',
    4,
    [
      day(1, 1, 'Full Body A', [
        { exercise: byName.get('Back Squat'), targetSets: 3, targetReps: 8, targetRpe: 6 },
        { exercise: byName.get('Bench Press'), targetSets: 3, targetReps: 8, targetRpe: 6 },
        { exercise: byName.get('Lat Pulldown'), targetSets: 3, targetReps: 10 },
      ]),
    ],
  );

  // --- Sharing: a friend can view and log against a shared program without
  // ever owning a copy of it. Separately, a coach can send a client a real,
  // independently-editable copy (see programs.service.ts `copy`).
  const programShareRepo = dataSource.getRepository(ProgramShare);
  async function shareIfMissing(program: Program, friend: User) {
    const existing = await programShareRepo.findOne({
      where: { program: { id: program.id }, sharedWith: { id: friend.id } },
    });
    if (existing) return;
    await programShareRepo.save(programShareRepo.create({ program, sharedWith: friend }));
    console.log(`Shared "${program.name}" with ${friend.name}.`);
  }

  await shareIfMissing(fiveThreeOne!, jordan);

  // --- Workout history: give a couple of the seeded users a realistic
  // training log so Progress/History views have something to render. New
  // users (Priya) are left with a clean slate to exercise the empty state.
  const sessionRepo = dataSource.getRepository(WorkoutSession);

  function mulberry32(seed: number) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }

  const BASE_WEIGHTS: Record<string, number> = {
    'Back Squat': 80,
    'Bench Press': 60,
    'Deadlift': 100,
    'Overhead Press': 40,
    'Front Squat': 60,
    'Romanian Deadlift': 70,
    'Barbell Row': 50,
    'Pull-Up': 5,
    'Incline Dumbbell Press': 22,
    'Leg Press': 120,
    'Lat Pulldown': 45,
    'Dumbbell Curl': 12,
    'Triceps Pushdown': 25,
    'Lateral Raise': 8,
    'Leg Curl': 30,
    'Leg Extension': 40,
    'Calf Raise': 60,
    'Face Pull': 20,
  };

  async function generateHistory(user: User, days: ProgramDay[], weeksBack: number) {
    const existingCount = await sessionRepo.count({ where: { user: { id: user.id } } });
    if (existingCount > 0) return;

    const rand = mulberry32(hashStr(user.email));
    const userFactor = 0.85 + (hashStr(user.email) % 30) / 100; // per-user strength spread
    const today = new Date();
    const sessions: WorkoutSession[] = [];

    for (let w = weeksBack; w >= 1; w--) {
      for (let i = 0; i < days.length; i++) {
        const d = days[i];
        const daysAgo = w * 7 - i * 2;
        if (daysAgo < 0) continue;
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);

        const skipped = rand() < 0.08;
        const session = new WorkoutSession();
        session.user = user;
        session.programDay = d;
        session.date = date.toISOString().slice(0, 10);
        session.status = skipped ? SessionStatus.SKIPPED : SessionStatus.COMPLETED;
        session.notes = skipped ? '' : rand() < 0.3 ? 'Felt good today.' : '';
        session.sets = [];

        if (!skipped) {
          const progress = (weeksBack - w) * 1.5; // gentle overload week to week
          for (const line of d.exercises) {
            const base = (BASE_WEIGHTS[line.exercise!.name] ?? 20) * userFactor + progress;
            // Ramp up to the working weight with a couple of warm-up sets on
            // anything with real working volume, so History/Progress show
            // what a realistic warm-up ramp looks like.
            const warmupCount = line.targetSets >= 3 ? 2 : line.targetSets >= 2 ? 1 : 0;
            let setNumber = 0;
            for (let wu = 0; wu < warmupCount; wu++) {
              setNumber++;
              const rampFactor = wu === 0 ? 0.5 : 0.75;
              session.sets.push(
                Object.assign(new SetLog(), {
                  exercise: line.exercise,
                  setNumber,
                  weight: Math.max(0, Math.round(base * rampFactor * 2) / 2),
                  reps: Math.max(1, line.targetReps + 2),
                  rpe: null,
                  setType: SetType.WARMUP,
                }),
              );
            }
            let lastWorkingWeight = base;
            for (let s = 1; s <= line.targetSets; s++) {
              setNumber++;
              const weightVariance = (rand() - 0.5) * 4;
              const repVariance = rand() < 0.2 ? (rand() < 0.5 ? -1 : 1) : 0;
              lastWorkingWeight = Math.max(0, Math.round((base + weightVariance) * 2) / 2);
              session.sets.push(
                Object.assign(new SetLog(), {
                  exercise: line.exercise,
                  setNumber,
                  weight: lastWorkingWeight,
                  reps: Math.max(1, line.targetReps + repVariance),
                  rpe: line.targetRpe ? Math.min(10, line.targetRpe + Math.round(rand())) : null,
                  setType: SetType.WORKING,
                }),
              );
            }
            // Isolation accessory work occasionally finishes with a drop
            // set, so the seeded data shows the new set types in action.
            if (line.exercise!.category === ExerciseCategory.ISOLATION && rand() < 0.3) {
              setNumber++;
              session.sets.push(
                Object.assign(new SetLog(), {
                  exercise: line.exercise,
                  setNumber,
                  weight: Math.round(lastWorkingWeight * 0.7 * 2) / 2,
                  reps: line.targetReps + 3,
                  rpe: 10,
                  setType: SetType.DROP_SET,
                }),
              );
            }
          }
        }
        // Keep sets in the order they were generated (see SetLog.orderIndex).
        session.sets.forEach((set, i) => (set.orderIndex = i + 1));
        sessions.push(session);
      }
    }

    await sessionRepo.save(sessions);
    console.log(`Generated ${sessions.length} workout sessions for ${user.name}.`);
  }

  await generateHistory(alex, fiveThreeOne!.days, 6);
  await generateHistory(sam, ppl!.days, 6);
  await generateHistory(jordan, jordanStarter!.days, 2);

  await dataSource.destroy();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
