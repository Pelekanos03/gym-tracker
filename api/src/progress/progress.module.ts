import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutSession } from '../domain/workout-session.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { CoachingModule } from '../coaching/coaching.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkoutSession]), CoachingModule],
  providers: [ProgressService],
  controllers: [ProgressController],
})
export class ProgressModule {}
