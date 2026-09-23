import { IsUUID } from 'class-validator';

export class ShareProgramDto {
  /** Must match the program's current owner. */
  @IsUUID()
  ownerId: string;

  /** The friend to share it with. */
  @IsUUID()
  friendId: string;
}
