import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { extname } from 'path';
import { CurrentUser } from '../auth/auth.decorators';
import type { SessionUser } from '../auth/session';
import { AVATAR_TYPES, avatarPath } from '../common/uploads';
import { UsersService } from '../users/users.service';
import { FriendshipService } from '../friendship/friendship.service';
import { CoachingService } from '../coaching/coaching.service';

const TYPE_BY_EXT = Object.fromEntries(Object.entries(AVATAR_TYPES).map(([type, ext]) => [ext, type]));

/**
 * Profile pictures. You see your own, your friends', and your coach's or
 * clients'; anyone else gets a 404 — same as if there were no picture.
 */
@Controller('avatars')
export class AvatarsController {
  constructor(
    private readonly users: UsersService,
    private readonly friendship: FriendshipService,
    private readonly coaching: CoachingService,
  ) {}

  @Get(':id')
  async avatar(
    @CurrentUser() me: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const user = await this.users.findById(id).catch(() => null);
    if (!user?.avatarFile || !(await this.canSee(me.id, id))) throw new NotFoundException('No picture');
    res.sendFile(avatarPath(user.avatarFile), {
      headers: {
        'Content-Type': TYPE_BY_EXT[extname(user.avatarFile)] ?? 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        // The URL carries ?v=<version>, so a new picture is a new URL.
        'Cache-Control': 'private, max-age=604800',
      },
    });
  }

  private async canSee(me: string, other: string): Promise<boolean> {
    if (me === other) return true;
    const yes = () => true;
    const no = () => false;
    return (
      (await this.friendship.assertFriends(me, other).then(yes, no)) ||
      (await this.coaching.assertCoach(me, other).then(yes, no)) ||
      (await this.coaching.assertCoach(other, me).then(yes, no))
    );
  }
}
