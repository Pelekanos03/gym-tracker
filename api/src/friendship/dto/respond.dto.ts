import { IsUUID } from 'class-validator';

/** Identifies which user is performing the action (no session auth yet). */
export class RespondDto {
  @IsUUID()
  userId: string;
}
