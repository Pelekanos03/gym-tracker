import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { SessionStatus } from '../../common/enums';
import { SetLogInput } from './log-session.dto';

export class UpdateSessionDto {
  /** Must match the session's owner (no session auth yet). */
  @IsUUID()
  userId: string;

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
