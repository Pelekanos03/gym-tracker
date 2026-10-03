import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { toPublicUser } from '../users/user.view';
import { CurrentUser, Public } from './auth.decorators';
import type { SessionUser } from './session';
import { UsersService } from '../users/users.service';
import { isAdmin } from '../feedback/admins';
import { MAX_VIDEO_MB } from '../common/uploads';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  /** 10 attempts a minute per IP — enough for typos, too slow to guess passwords. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.login(dto);
    await this.auth.startSession(res, user);
    return toPublicUser(user);
  }

  /** What the sign-up form needs to know up front. */
  @Public()
  @Get('config')
  config() {
    return { inviteRequired: !!process.env.SIGNUP_INVITE_CODE, maxVideoMb: MAX_VIDEO_MB };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.requestPasswordReset(dto.email);
    return { ok: true };
  }

  /** Sets the new password and logs you straight in. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.resetPassword(dto.token, dto.password);
    await this.auth.startSession(res, user);
    return toPublicUser(user);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    this.auth.endSession(res);
    return { ok: true };
  }

  /** Who the session cookie belongs to — how the app restores a login on reload. */
  @Get('me')
  async me(@CurrentUser() me: SessionUser) {
    const user = await this.users.findById(me.id);
    return { ...toPublicUser(user), isAdmin: isAdmin(user.email) };
  }
}
