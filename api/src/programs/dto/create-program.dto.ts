import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Discipline } from '../../common/enums';

export class ProgramExerciseInput {
  @IsUUID()
  exerciseId: string;

  @IsInt()
  @Min(1)
  orderIndex: number;

  @IsInt()
  @Min(1)
  targetSets: number;

  @IsInt()
  @Min(1)
  targetReps: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  targetRpe?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  targetPercent1rm?: number;

  /** Exact prescribed load in kg — how a coach sends a concrete number instead of RPE/%1RM. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetWeight?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProgramDayInput {
  @IsInt()
  @Min(1)
  weekNumber: number;

  @IsInt()
  @Min(1)
  dayNumber: number;

  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramExerciseInput)
  exercises: ProgramExerciseInput[];
}

export class CreateProgramDto {
  @IsUUID()
  ownerId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Discipline)
  discipline?: Discipline;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  lengthWeeks?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgramDayInput)
  days: ProgramDayInput[];
}
