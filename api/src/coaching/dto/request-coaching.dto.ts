import { IsUUID } from 'class-validator';

export class RequestCoachingDto {
  /** The user asking to become the coach. */
  @IsUUID()
  coachId: string;

  /** The friend they're asking to coach. Must already be friends. */
  @IsUUID()
  clientId: string;
}
