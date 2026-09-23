import { Controller, Get, Param } from '@nestjs/common';
import { ProgressService } from './progress.service';

@Controller()
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  /** A user's own progress. */
  @Get('users/:userId/progress')
  mine(@Param('userId') userId: string) {
    return this.progress.forUser(userId);
  }

  /** A friend's progress (requires an accepted friendship). */
  @Get('users/:viewerId/friends/:friendId/progress')
  friendProgress(
    @Param('viewerId') viewerId: string,
    @Param('friendId') friendId: string,
  ) {
    return this.progress.forUserAsFriend(viewerId, friendId);
  }
}
