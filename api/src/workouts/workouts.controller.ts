import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { LogSessionDto } from './dto/log-session.dto';

@Controller()
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  /** Client logs a session. */
  @Post('workout-sessions')
  log(@Body() dto: LogSessionDto) {
    return this.workouts.log(dto);
  }

  /** A client's own history. */
  @Get('clients/:clientId/workout-sessions')
  clientHistory(@Param('clientId') clientId: string) {
    return this.workouts.historyForClient(clientId);
  }

  /** Coach views one client's history (coachId supplied as a query param for now). */
  @Get('coaches/:coachId/clients/:clientId/workout-sessions')
  coachViewOfClient(
    @Param('coachId') coachId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.workouts.clientHistoryForCoach(coachId, clientId);
  }

  @Get('workout-sessions/:id')
  get(@Param('id') id: string) {
    return this.workouts.findById(id);
  }
}
