import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutSession } from '../domain/workout-session.entity';
import { SetLog } from '../domain/set-log.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { WorkoutDraft } from '../domain/workout-draft.entity';
import { DraftController } from './draft.controller';
import { WorkoutsService } from './workouts.service';
import { WorkoutsController } from './workouts.controller';
import { UsersModule } from '../users/users.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { CoachingModule } from '../coaching/coaching.module';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkoutSession, SetLog, ProgramDay, WorkoutDraft]),
    UsersModule,
    ExercisesModule,
    CoachingModule,
    BlocksModule,
  ],
  providers: [WorkoutsService],
  controllers: [WorkoutsController, DraftController],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}
