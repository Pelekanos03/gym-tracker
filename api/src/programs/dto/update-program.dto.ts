import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Discipline } from '../../common/enums';
import { ProgramDayInput } from './create-program.dto';

export class UpdateProgramDto {
  /** Must match the program's current owner (no session auth yet). */
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
