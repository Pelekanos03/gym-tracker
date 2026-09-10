import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AssignProgramDto {
  @IsUUID()
  coachId: string;

  @IsUUID()
  clientId: string;

  /** ISO date (YYYY-MM-DD). Defaults to today when omitted. */
  @IsOptional()
  @IsDateString()
  startDate?: string;
}
