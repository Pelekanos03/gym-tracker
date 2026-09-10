import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { AssignProgramDto } from './dto/assign-program.dto';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Post()
  create(@Body() dto: CreateProgramDto) {
    return this.programs.create(dto);
  }

  @Get()
  list(@Query('coachId') coachId: string) {
    return this.programs.findByCoach(coachId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.programs.findById(id);
  }

  @Post(':id/assignments')
  assign(@Param('id') id: string, @Body() dto: AssignProgramDto) {
    return this.programs.assign(id, dto);
  }
}
