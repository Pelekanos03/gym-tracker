import { IsUUID } from 'class-validator';

/** Identifies who is acting on a block (no session auth yet). */
export class BlockOwnerDto {
  @IsUUID()
  userId: string;
}
