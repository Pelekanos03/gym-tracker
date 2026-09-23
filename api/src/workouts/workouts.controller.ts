import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { LogSessionDto } from './dto/log-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { DeleteSessionDto } from './dto/delete-session.dto';

@Controller()
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  /** Log a session. */
  @Post('workout-sessions')
  log(@Body() dto: LogSessionDto) {
    return this.workouts.log(dto);
  }

  /** A user's own history. */
  @Get('users/:userId/workout-sessions')
  myHistory(@Param('userId') userId: string) {
    return this.workouts.historyForUser(userId);
  }

  /** A friend's history (requires an accepted friendship). */
  @Get('users/:viewerId/friends/:friendId/workout-sessions')
  friendHistory(
    @Param('viewerId') viewerId: string,
    @Param('friendId') friendId: string,
  ) {
    return this.workouts.historyForFriend(viewerId, friendId);
  }

  @Get('workout-sessions/:id')
  get(@Param('id') id: string) {
    return this.workouts.findById(id);
  }

  @Patch('workout-sessions/:id')
  update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.workouts.update(id, dto);
  }

  @Delete('workout-sessions/:id')
  async delete(@Param('id') id: string, @Body() dto: DeleteSessionDto) {
    await this.workouts.delete(id, dto.userId);
    return { ok: true };
  }
}
