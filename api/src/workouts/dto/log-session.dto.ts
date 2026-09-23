import { Type } from 'class-transformer';
import {
  IsArray,
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
import { SessionStatus, SetType } from '../../common/enums';

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
  @IsEnum(SetType)
  setType?: SetType;
}

export class LogSessionDto {
  @IsUUID()
  userId: string;

  /** Optional: ties the session to a specific planned day of one of this user's own programs. */
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
