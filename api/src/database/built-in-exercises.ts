import { Exercise } from '../domain/exercise.entity';
import { ExerciseCategory } from '../common/enums';

/**
 * The shared starter library everyone sees (ownerId null). The API makes
 * sure these exist on every startup, so a fresh production database has
 * them without running the demo seed.
 */
export const BUILT_IN_EXERCISES: (Pick<Exercise, 'name' | 'category' | 'primaryMuscle'> &
  Partial<Pick<Exercise, 'isCompetitionLift'>>)[] = [
  { name: 'Back Squat', category: ExerciseCategory.COMPOUND, primaryMuscle: 'Quads', isCompetitionLift: true },
  { name: 'Bench Press', category: ExerciseCategory.COMPOUND, primaryMuscle: 'Chest', isCompetitionLift: true },
  { name: 'Deadlift', category: ExerciseCategory.COMPOUND, primaryMuscle: 'Posterior Chain', isCompetitionLift: true },
  { name: 'Overhead Press', category: ExerciseCategory.COMPOUND, primaryMuscle: 'Shoulders' },
  { name: 'Front Squat', category: ExerciseCategory.COMPOUND, primaryMuscle: 'Quads' },
  { name: 'Romanian Deadlift', category: ExerciseCategory.COMPOUND, primaryMuscle: 'Hamstrings' },
  { name: 'Barbell Row', category: ExerciseCategory.COMPOUND, primaryMuscle: 'Back' },
  { name: 'Pull-Up', category: ExerciseCategory.COMPOUND, primaryMuscle: 'Back' },
  { name: 'Incline Dumbbell Press', category: ExerciseCategory.COMPOUND, primaryMuscle: 'Chest' },
  { name: 'Leg Press', category: ExerciseCategory.COMPOUND, primaryMuscle: 'Quads' },
  { name: 'Lat Pulldown', category: ExerciseCategory.ISOLATION, primaryMuscle: 'Back' },
  { name: 'Dumbbell Curl', category: ExerciseCategory.ISOLATION, primaryMuscle: 'Biceps' },
  { name: 'Triceps Pushdown', category: ExerciseCategory.ISOLATION, primaryMuscle: 'Triceps' },
  { name: 'Lateral Raise', category: ExerciseCategory.ISOLATION, primaryMuscle: 'Shoulders' },
  { name: 'Leg Curl', category: ExerciseCategory.ISOLATION, primaryMuscle: 'Hamstrings' },
  { name: 'Leg Extension', category: ExerciseCategory.ISOLATION, primaryMuscle: 'Quads' },
  { name: 'Calf Raise', category: ExerciseCategory.ISOLATION, primaryMuscle: 'Calves' },
  { name: 'Face Pull', category: ExerciseCategory.ISOLATION, primaryMuscle: 'Rear Delts' },
];
