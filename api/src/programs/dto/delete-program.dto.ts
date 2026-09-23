import { IsUUID } from 'class-validator';

/** Identifies who is deleting (no session auth yet). */
export class DeleteProgramDto {
  @IsUUID()
  ownerId: string;
}
