import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coaching } from '../domain/coaching.entity';
import { CoachingService } from './coaching.service';
import { CoachingController } from './coaching.controller';
import { UsersModule } from '../users/users.module';
import { FriendshipModule } from '../friendship/friendship.module';

@Module({
  imports: [TypeOrmModule.forFeature([Coaching]), UsersModule, FriendshipModule],
  providers: [CoachingService],
  controllers: [CoachingController],
  exports: [CoachingService],
})
export class CoachingModule {}
