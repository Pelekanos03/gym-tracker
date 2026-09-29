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

/** One drop after the top set of a drop set. */
export class SetDropInput {
  @IsNumber()
  @Min(0)
  weight: number;

  @IsInt()
  @Min(0)
  reps: number;
}

/** The other exercise done back-to-back with a superset set. */
export class SupersetPartnerInput {
  @IsUUID()
  exerciseId: string;

  @IsNumber()
  @Min(0)
  weight: number;

  @IsInt()
  @Min(0)
  reps: number;
}

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

  /** The drops that followed the top set, in order. Ignored unless setType is DROP_SET. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetDropInput)
  drops?: SetDropInput[];

  /** The other exercises done back-to-back, in order. Ignored unless setType is SUPERSET. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupersetPartnerInput)
  supersetPartners?: SupersetPartnerInput[];
}

export class LogSessionDto {
  @IsUUID()
  userId: string;

  /** Optional: ties the session to a specific planned day of one of this user's own programs. */
  @IsOptional()
  @IsUUID()
  programDayId?: string;

  /** Optional: counts this session toward that training block. Needs programDayId too. */
  @IsOptional()
  @IsUUID()
  blockId?: string;

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
