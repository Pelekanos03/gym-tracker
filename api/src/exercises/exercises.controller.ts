import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { MergeExercisesDto } from './dto/merge-exercises.dto';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  list() {
    return this.exercises.findAll();
  }

  /** Must come before ':id' or Nest would try to route it as an exercise id. */
  @Get('merge-preview')
  mergePreview(@Query('keepId') keepId: string, @Query('mergeId') mergeId: string) {
    return this.exercises.mergePreview(keepId, mergeId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.exercises.findById(id);
  }

  @Post()
  create(@Body() dto: CreateExerciseDto) {
    return this.exercises.create(dto);
  }

  @Post('merge')
  merge(@Body() dto: MergeExercisesDto) {
    return this.exercises.merge(dto.keepId, dto.mergeId);
  }
}
