import { IsUUID } from 'class-validator';

export class CopyProgramDto {
  /** Whose library the copy lands in. Must be the program's owner, or a friend of theirs. */
  @IsUUID()
  toUserId: string;
}
