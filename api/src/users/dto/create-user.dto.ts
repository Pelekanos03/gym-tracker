import { Equals, IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  /** Must be ticked, separately: explicit consent to store health data (GDPR art. 9). */
  @Equals(true, { message: 'Please agree to the app storing the health data you log' })
  healthConsent: boolean;

  /** Optional and unticked by default: may we share your data with partners? */
  @IsOptional()
  @IsBoolean()
  consentPartners?: boolean;

  /** Optional and unticked by default: may your data be used to train AI models? */
  @IsOptional()
  @IsBoolean()
  consentAi?: boolean;

  /** Required only when the server sets SIGNUP_INVITE_CODE (a closed beta). */
  @IsOptional()
  @IsString()
  inviteCode?: string;
}
