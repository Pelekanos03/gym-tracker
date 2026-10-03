import { Equals, IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  newPassword: string;
}

export class PreferencesDto {
  @IsIn(['off', 'daily', 'weekly'])
  weightReminder: 'off' | 'daily' | 'weekly';
}

/** Your privacy choices. Each is optional; only the ones sent change. */
export class ConsentsDto {
  /** Can only be given (true) — withdrawing means deleting your data. */
  @IsOptional()
  @Equals(true)
  health?: boolean;

  @IsOptional()
  @IsBoolean()
  partners?: boolean;

  @IsOptional()
  @IsBoolean()
  ai?: boolean;
}

/** Deleting your account needs your password again — a stolen session alone can't do it. */
export class DeleteAccountDto {
  @IsString()
  password: string;
}
