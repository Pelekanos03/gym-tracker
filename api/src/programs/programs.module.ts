import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Program } from '../domain/program.entity';
import { ProgramDay } from '../domain/program-day.entity';
import { ProgramExercise } from '../domain/program-exercise.entity';
import { ProgramAssignment } from '../domain/program-assignment.entity';
import { ProgramsService } from './programs.service';
import { ProgramsController } from './programs.controller';
import { UsersModule } from '../users/users.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { CoachingModule } from '../coaching/coaching.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Program,
      ProgramDay,
      ProgramExercise,
      ProgramAssignment,
    ]),
    UsersModule,
    ExercisesModule,
    CoachingModule,
  ],
  providers: [ProgramsService],
  controllers: [ProgramsController],
  exports: [ProgramsService],
})
export class ProgramsModule {}
