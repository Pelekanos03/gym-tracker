import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source-options';
import { Exercise } from '../domain/exercise.entity';
import { User } from '../domain/user.entity';
import { Discipline, ExerciseCategory, UserRole } from '../common/enums';
import { hashPassword } from '../common/password';

/**
 * Populates a fresh database with a starter exercise library and one
 * coach + one client so you can click around immediately.
 *
 * Run with:  npm run seed --workspace api
 */
const EXERCISES: Partial<Exercise>[] = [
  { name: 'Back Squat', category: ExerciseCategory.COMPOUND, discipline: Discipline.BOTH, primaryMuscle: 'Quads', isCompetitionLift: true },
  { name: 'Bench Press', category: ExerciseCategory.COMPOUND, discipline: Discipline.BOTH, primaryMuscle: 'Chest', isCompetitionLift: true },
  { name: 'Deadlift', category: ExerciseCategory.COMPOUND, discipline: Discipline.BOTH, primaryMuscle: 'Posterior Chain', isCompetitionLift: true },
  { name: 'Overhead Press', category: ExerciseCategory.COMPOUND, discipline: Discipline.BOTH, primaryMuscle: 'Shoulders' },
  { name: 'Front Squat', category: ExerciseCategory.COMPOUND, discipline: Discipline.BOTH, primaryMuscle: 'Quads' },
  { name: 'Romanian Deadlift', category: ExerciseCategory.COMPOUND, discipline: Discipline.BOTH, primaryMuscle: 'Hamstrings' },
  { name: 'Barbell Row', category: ExerciseCategory.COMPOUND, discipline: Discipline.BOTH, primaryMuscle: 'Back' },
  { name: 'Pull-Up', category: ExerciseCategory.COMPOUND, discipline: Discipline.BODYBUILDING, primaryMuscle: 'Back' },
  { name: 'Incline Dumbbell Press', category: ExerciseCategory.COMPOUND, discipline: Discipline.BODYBUILDING, primaryMuscle: 'Chest' },
  { name: 'Leg Press', category: ExerciseCategory.COMPOUND, discipline: Discipline.BODYBUILDING, primaryMuscle: 'Quads' },
  { name: 'Lat Pulldown', category: ExerciseCategory.ISOLATION, discipline: Discipline.BODYBUILDING, primaryMuscle: 'Back' },
  { name: 'Dumbbell Curl', category: ExerciseCategory.ISOLATION, discipline: Discipline.BODYBUILDING, primaryMuscle: 'Biceps' },
  { name: 'Triceps Pushdown', category: ExerciseCategory.ISOLATION, discipline: Discipline.BODYBUILDING, primaryMuscle: 'Triceps' },
  { name: 'Lateral Raise', category: ExerciseCategory.ISOLATION, discipline: Discipline.BODYBUILDING, primaryMuscle: 'Shoulders' },
  { name: 'Leg Curl', category: ExerciseCategory.ISOLATION, discipline: Discipline.BODYBUILDING, primaryMuscle: 'Hamstrings' },
  { name: 'Leg Extension', category: ExerciseCategory.ISOLATION, discipline: Discipline.BODYBUILDING, primaryMuscle: 'Quads' },
  { name: 'Calf Raise', category: ExerciseCategory.ISOLATION, discipline: Discipline.BODYBUILDING, primaryMuscle: 'Calves' },
  { name: 'Face Pull', category: ExerciseCategory.ISOLATION, discipline: Discipline.BODYBUILDING, primaryMuscle: 'Rear Delts' },
];

async function run() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const exerciseRepo = dataSource.getRepository(Exercise);
  for (const data of EXERCISES) {
    const exists = await exerciseRepo.findOne({ where: { name: data.name } });
    if (!exists) await exerciseRepo.save(exerciseRepo.create(data));
  }
  console.log(`Seeded ${EXERCISES.length} exercises.`);

  const userRepo = dataSource.getRepository(User);
  const demoUsers = [
    { name: 'Demo Coach', email: 'coach@example.com', role: UserRole.COACH },
    { name: 'Demo Client', email: 'client@example.com', role: UserRole.CLIENT },
  ];
  for (const data of demoUsers) {
    const exists = await userRepo.findOne({ where: { email: data.email } });
    if (!exists) {
      await userRepo.save(
        userRepo.create({ ...data, passwordHash: hashPassword('password123') }),
      );
      console.log(`Created ${data.role.toLowerCase()} ${data.email} (password: password123)`);
    }
  }

  await dataSource.destroy();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
