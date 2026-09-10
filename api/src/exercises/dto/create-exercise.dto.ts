import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Discipline, ExerciseCategory } from '../../common/enums';

export class CreateExerciseDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(ExerciseCategory)
  category: ExerciseCategory;

  @IsEnum(Discipline)
  @IsOptional()
  discipline?: Discipline;

  @IsString()
  primaryMuscle: string;

  @IsBoolean()
  @IsOptional()
  isCompetitionLift?: boolean;
}
