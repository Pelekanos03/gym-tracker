import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  list() {
    return this.exercises.findAll();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.exercises.findById(id);
  }

  @Post()
  create(@Body() dto: CreateExerciseDto) {
    return this.exercises.create(dto);
  }
}
