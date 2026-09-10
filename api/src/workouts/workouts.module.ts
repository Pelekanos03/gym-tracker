import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutSession } from '../domain/workout-session.entity';
import { SetLog } from '../domain/set-log.entity';
import { ProgramAssignment } from '../domain/program-assignment.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { WorkoutsService } from './workouts.service';
import { WorkoutsController } from './workouts.controller';
import { UsersModule } from '../users/users.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { CoachingModule } from '../coaching/coaching.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkoutSession,
      SetLog,
      ProgramAssignment,
      ProgramDay,
    ]),
    UsersModule,
    ExercisesModule,
    CoachingModule,
  ],
  providers: [WorkoutsService],
  controllers: [WorkoutsController],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}
