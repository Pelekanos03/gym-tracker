import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutSession } from '../domain/workout-session.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { FriendshipModule } from '../friendship/friendship.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkoutSession]), FriendshipModule],
  providers: [ProgressService],
  controllers: [ProgressController],
})
export class ProgressModule {}
