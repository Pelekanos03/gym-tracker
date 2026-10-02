import { Body, Controller, Delete, Get, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AccountService } from './account.service';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/auth.decorators';
import type { SessionUser } from '../auth/session';
import { ChangePasswordDto, DeleteAccountDto, PreferencesDto } from './dto/account.dto';
import { UsersService } from '../users/users.service';
import { toPublicUser } from '../users/user.view';

@Controller('account')
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  /** Your settings (for now: the body-weight reminder). */
  @Post('preferences')
  @HttpCode(200)
  async preferences(@CurrentUser() me: SessionUser, @Body() dto: PreferencesDto) {
    return toPublicUser(await this.users.update(me.id, { weightReminder: dto.weightReminder }));
  }

  /** Other devices are logged out; this one gets a fresh session. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('password')
  @HttpCode(200)
  async changePassword(
    @CurrentUser() me: SessionUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.account.changePassword(me.id, dto.currentPassword, dto.newPassword);
    await this.auth.startSession(res, user);
    return { ok: true };
  }

  /** Downloads everything stored about you as a JSON file. */
  @Get('export')
  async export(@CurrentUser() me: SessionUser, @Res({ passthrough: true }) res: Response) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="gym-app-export-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    return this.account.export(me.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Delete()
  async delete(
    @CurrentUser() me: SessionUser,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.account.deleteAccount(me.id, dto.password);
    this.auth.endSession(res);
    return { ok: true };
  }
}
