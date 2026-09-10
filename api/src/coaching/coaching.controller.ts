import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { CoachingService } from './coaching.service';
import { toPublicUser } from '../users/user.view';

class LinkClientDto {
  @IsUUID()
  clientId: string;
}

@Controller('coaches/:coachId/clients')
export class CoachingController {
  constructor(private readonly coaching: CoachingService) {}

  @Get()
  async roster(@Param('coachId') coachId: string) {
    const links = await this.coaching.clientsOf(coachId);
    return links.map((l) => ({
      relationshipId: l.id,
      since: l.createdAt,
      client: toPublicUser(l.client),
    }));
  }

  @Post()
  async add(@Param('coachId') coachId: string, @Body() dto: LinkClientDto) {
    const link = await this.coaching.link(coachId, dto.clientId);
    return { relationshipId: link.id, client: toPublicUser(link.client) };
  }

  @Delete(':clientId')
  async remove(
    @Param('coachId') coachId: string,
    @Param('clientId') clientId: string,
  ) {
    await this.coaching.unlink(coachId, clientId);
    return { ok: true };
  }
}
