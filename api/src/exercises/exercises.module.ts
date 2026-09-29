import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from '../domain/exercise.entity';
import { ProgramExercise } from '../domain/program-exercise.entity';
import { SetLog } from '../domain/set-log.entity';
import { SupersetPartner } from '../domain/superset-partner.entity';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Exercise, ProgramExercise, SetLog, SupersetPartner])],
  providers: [ExercisesService],
  controllers: [ExercisesController],
  exports: [ExercisesService],
})
export class ExercisesModule {}
