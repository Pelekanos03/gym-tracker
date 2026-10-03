import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { FriendshipModule } from '../friendship/friendship.module';
import { CoachingModule } from '../coaching/coaching.module';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { AvatarsController } from './avatars.controller';

@Module({
  imports: [UsersModule, FriendshipModule, CoachingModule],
  providers: [AccountService],
  controllers: [AccountController, AvatarsController],
})
export class AccountModule {}
