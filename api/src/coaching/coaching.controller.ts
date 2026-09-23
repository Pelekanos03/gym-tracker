import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CoachingService } from './coaching.service';
import { RequestCoachingDto } from './dto/request-coaching.dto';
import { RespondCoachingDto } from './dto/respond-coaching.dto';
import { toPublicUser } from '../users/user.view';

@Controller()
export class CoachingController {
  constructor(private readonly coaching: CoachingService) {}

  @Post('coaching-requests')
  request(@Body() dto: RequestCoachingDto) {
    return this.coaching.request(dto.coachId, dto.clientId);
  }

  @Post('coaching-requests/:id/accept')
  accept(@Param('id') id: string, @Body() dto: RespondCoachingDto) {
    return this.coaching.respond(id, dto.userId, true);
  }

  @Delete('coaching-requests/:id')
  decline(@Param('id') id: string, @Body() dto: RespondCoachingDto) {
    return this.coaching.respond(id, dto.userId, false);
  }

  @Delete('coachings/:id')
  async revoke(@Param('id') id: string, @Body() dto: RespondCoachingDto) {
    await this.coaching.revoke(id, dto.userId);
    return { ok: true };
  }

  @Get('users/:userId/coaching-requests')
  async requests(
    @Param('userId') userId: string,
    @Query('direction') direction: 'incoming' | 'outgoing' = 'incoming',
  ) {
    const requests =
      direction === 'outgoing'
        ? await this.coaching.outgoingRequests(userId)
        : await this.coaching.incomingRequests(userId);

    return requests.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      coach: toPublicUser(r.coach),
      client: toPublicUser(r.client),
    }));
  }

  /** Who coaches this user. */
  @Get('users/:userId/coaches')
  async coaches(@Param('userId') userId: string) {
    const rows = await this.coaching.coachesOf(userId);
    return rows.map((r) => ({ coachingId: r.coachingId, coach: toPublicUser(r.coach) }));
  }

  /** Who this user coaches. */
  @Get('users/:userId/clients')
  async clients(@Param('userId') userId: string) {
    const rows = await this.coaching.clientsOf(userId);
    return rows.map((r) => ({ coachingId: r.coachingId, client: toPublicUser(r.client) }));
  }
}
