import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { SendRequestDto } from './dto/send-request.dto';
import { RespondDto } from './dto/respond.dto';
import { toOtherUser } from '../users/user.view';

@Controller()
export class FriendshipController {
  constructor(private readonly friendship: FriendshipService) {}

  @Post('friend-requests')
  send(@Body() dto: SendRequestDto) {
    return this.friendship.sendRequest(dto.fromUserId, dto.toUserId);
  }

  @Post('friend-requests/:id/accept')
  accept(@Param('id') id: string, @Body() dto: RespondDto) {
    return this.friendship.respond(id, dto.userId, true);
  }

  @Delete('friend-requests/:id')
  decline(@Param('id') id: string, @Body() dto: RespondDto) {
    return this.friendship.respond(id, dto.userId, false);
  }

  @Delete('friendships/:id')
  async unfriend(@Param('id') id: string, @Body() dto: RespondDto) {
    await this.friendship.unfriend(id, dto.userId);
    return { ok: true };
  }

  @Get('users/:userId/friends')
  async friends(@Param('userId') userId: string) {
    const links = await this.friendship.friendsOf(userId);
    return links.map((l) => ({
      friendshipId: l.friendshipId,
      since: l.since,
      friend: toOtherUser(l.friend),
    }));
  }

  @Get('users/:userId/friend-requests')
  async requests(
    @Param('userId') userId: string,
    @Query('direction') direction: 'incoming' | 'outgoing' = 'incoming',
  ) {
    const requests =
      direction === 'outgoing'
        ? await this.friendship.outgoingRequests(userId)
        : await this.friendship.incomingRequests(userId);

    return requests.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      from: toOtherUser(r.requester),
      to: toOtherUser(r.addressee),
    }));
  }
}
