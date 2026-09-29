import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ExerciseCategory } from '../../common/enums';

export class CreateExerciseDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(ExerciseCategory)
  category: ExerciseCategory;

  @IsString()
  primaryMuscle: string;

  @IsBoolean()
  @IsOptional()
  isCompetitionLift?: boolean;
}
