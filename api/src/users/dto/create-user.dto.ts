import { Equals, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password: string;

  /** Must be ticked: agreeing to the terms & privacy policy. */
  @Equals(true, { message: 'Please accept the terms and privacy policy' })
  acceptTerms: boolean;

  /** Required only when the server sets SIGNUP_INVITE_CODE (a closed beta). */
  @IsOptional()
  @IsString()
  inviteCode?: string;
}
