import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.decorators';
import type { SessionUser } from '../auth/session';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { MergeExercisesDto } from './dto/merge-exercises.dto';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  list(@Query('userId', ParseUUIDPipe) userId: string) {
    return this.exercises.findVisibleTo(userId);
  }

  /** Must come before ':id' or Nest would try to route it as an exercise id. */
  @Get('merge-preview')
  mergePreview(
    @Query('keepId') keepId: string,
    @Query('mergeId') mergeId: string,
    @Query('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.exercises.mergePreview(keepId, mergeId, userId);
  }

  /** Must also come before ':id'. */
  @Get(':id/delete-preview')
  deletePreview(@Param('id') id: string, @CurrentUser() me: SessionUser) {
    return this.exercises.deletePreview(id, me.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() me: SessionUser) {
    await this.exercises.deleteOwn(id, me.id);
    return { ok: true };
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
    return this.exercises.merge(dto.keepId, dto.mergeId, dto.userId);
  }
}
