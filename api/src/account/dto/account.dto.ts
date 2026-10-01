import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  newPassword: string;
}

/** Deleting your account needs your password again — a stolen session alone can't do it. */
export class DeleteAccountDto {
  @IsString()
  password: string;
}
