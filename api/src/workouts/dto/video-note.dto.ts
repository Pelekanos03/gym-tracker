import { IsString, IsUUID, MaxLength } from 'class-validator';
import { MAX_VIDEO_NOTE } from './log-session.dto';

/** The lifter's comment on one set's video; empty clears it. */
export class VideoNoteDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MaxLength(MAX_VIDEO_NOTE)
  note: string;
}
