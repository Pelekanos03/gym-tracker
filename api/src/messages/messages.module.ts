import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../domain/message.entity';
import { FriendshipModule } from '../friendship/friendship.module';
import { CoachingModule } from '../coaching/coaching.module';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), FriendshipModule, CoachingModule],
  providers: [MessagesService],
  controllers: [MessagesController],
})
export class MessagesModule {}
