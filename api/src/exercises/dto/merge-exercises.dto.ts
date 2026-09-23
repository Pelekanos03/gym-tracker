import { IsUUID } from 'class-validator';

export class MergeExercisesDto {
  /** The exercise that survives the merge. */
  @IsUUID()
  keepId: string;

  /** The duplicate exercise being folded into keepId, then deleted. */
  @IsUUID()
  mergeId: string;
}
