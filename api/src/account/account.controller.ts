import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { AVATAR_DIR, AVATAR_TYPES, MAX_AVATAR_BYTES, removeAvatarFile } from '../common/uploads';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AccountService } from './account.service';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/auth.decorators';
import type { SessionUser } from '../auth/session';
import { ChangePasswordDto, ConsentsDto, DeleteAccountDto, PreferencesDto } from './dto/account.dto';
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

  /** Change your privacy choices (share with partners, AI training; give health-data consent). */
  @Post('consents')
  @HttpCode(200)
  async consents(@CurrentUser() me: SessionUser, @Body() dto: ConsentsDto) {
    const user = await this.users.findById(me.id);
    return toPublicUser(await this.users.setConsents(user, dto));
  }

  /** Set (or replace) your profile picture: multipart field "avatar", a JPEG/PNG/WebP. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('avatar')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: AVATAR_DIR,
        // Random name, extension from the allow-list — never from the upload.
        filename: (_req, file, cb) => cb(null, randomUUID() + AVATAR_TYPES[file.mimetype]),
      }),
      limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
      fileFilter: (_req, file, cb) =>
        AVATAR_TYPES[file.mimetype]
          ? cb(null, true)
          : cb(new BadRequestException('Use a JPEG, PNG or WebP picture'), false),
    }),
  )
  async setAvatar(@CurrentUser() me: SessionUser, @UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('Attach a picture in the "avatar" field');
    const previous = (await this.users.findById(me.id)).avatarFile;
    const user = await this.users.update(me.id, { avatarFile: file.filename });
    await removeAvatarFile(previous);
    return toPublicUser(user);
  }

  /** Back to the blank face. */
  @Delete('avatar')
  async removeAvatar(@CurrentUser() me: SessionUser) {
    const previous = (await this.users.findById(me.id)).avatarFile;
    const user = await this.users.update(me.id, { avatarFile: null });
    await removeAvatarFile(previous);
    return toPublicUser(user);
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
