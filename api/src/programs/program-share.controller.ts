import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ProgramShareService } from './program-share.service';
import { ProgramsService } from './programs.service';
import { ShareProgramDto } from './dto/share-program.dto';
import { toPublicUser } from '../users/user.view';
import { CurrentUser } from '../auth/auth.decorators';
import type { SessionUser } from '../auth/session';

/**
 * Routes for the "share a program with a friend" flow, plus a coach's view
 * of their client's programs. Split from ProgramsController because these
 * are shaped around users/relationships rather than a single program id.
 */
@Controller()
export class ProgramShareController {
  constructor(
    private readonly shares: ProgramShareService,
    private readonly programs: ProgramsService,
  ) {}

  @Post('programs/:id/share')
  share(@Param('id') id: string, @Body() dto: ShareProgramDto) {
    return this.shares.share(id, dto.ownerId, dto.friendId);
  }

  @Delete('programs/:id/share')
  async unshare(@Param('id') id: string, @Body() dto: ShareProgramDto) {
    await this.shares.unshare(id, dto.ownerId, dto.friendId);
    return { ok: true };
  }

  /** Who a program is currently shared with, for the owner to manage. */
  @Get('programs/:id/shares')
  async sharesFor(@Param('id') id: string, @CurrentUser() me: SessionUser) {
    const rows = await this.shares.sharesFor(id, me.id);
    return rows.map((r) => ({ id: r.id, sharedWith: toPublicUser(r.sharedWith) }));
  }

  /** Programs friends have shared with this user — usable for logging, not owned. */
  @Get('users/:userId/shared-programs')
  sharedWithMe(@Param('userId') userId: string) {
    return this.shares.sharedWithMe(userId);
  }

  /** A coach viewing their client's programs (requires an accepted coaching link). */
  @Get('users/:viewerId/clients/:clientId/programs')
  clientPrograms(
    @Param('viewerId') viewerId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.programs.findByOwnerForCoach(clientId, viewerId);
  }
}
