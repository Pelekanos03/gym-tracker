import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { SessionStatus } from '../../common/enums';

export class SetLogInput {
  @IsUUID()
  exerciseId: string;

  @IsInt()
  @Min(1)
  setNumber: number;

  @IsNumber()
  @Min(0)
  weight: number;

  @IsInt()
  @Min(0)
  reps: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  rpe?: number;

  @IsOptional()
  @IsBoolean()
  isWarmup?: boolean;
}

export class LogSessionDto {
  @IsUUID()
  clientId: string;

  /** Optional: ties the session to a specific planned day of an assigned program. */
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsOptional()
  @IsUUID()
  programDayId?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetLogInput)
  sets: SetLogInput[];
}
