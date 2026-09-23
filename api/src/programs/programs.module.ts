import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Program } from '../domain/program.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { ProgramExercise } from '../domain/program-exercise.entity';
import { ProgramShare } from '../domain/program-share.entity';
import { ProgramsService } from './programs.service';
import { ProgramShareService } from './program-share.service';
import { ProgramsController } from './programs.controller';
import { ProgramShareController } from './program-share.controller';
import { UsersModule } from '../users/users.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { FriendshipModule } from '../friendship/friendship.module';
import { CoachingModule } from '../coaching/coaching.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Program, ProgramDay, ProgramExercise, ProgramShare]),
    UsersModule,
    ExercisesModule,
    FriendshipModule,
    CoachingModule,
  ],
  providers: [ProgramsService, ProgramShareService],
  controllers: [ProgramsController, ProgramShareController],
  exports: [ProgramsService, ProgramShareService],
})
export class ProgramsModule {}
