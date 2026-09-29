import { IsUUID } from 'class-validator';

export class StartBlockDto {
  /** Who is starting it (no session auth yet). */
  @IsUUID()
  userId: string;

  /** One of the user's own programs, or one a friend shared with them. */
  @IsUUID()
  programId: string;
}
