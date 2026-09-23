import { IsUUID } from 'class-validator';

export class SendRequestDto {
  @IsUUID()
  fromUserId: string;

  @IsUUID()
  toUserId: string;
}
