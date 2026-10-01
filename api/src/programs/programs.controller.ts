import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { CopyProgramDto } from './dto/copy-program.dto';
import { DeleteProgramDto } from './dto/delete-program.dto';
import { ProgramShareService } from './program-share.service';
import { CurrentUser } from '../auth/auth.decorators';
import type { SessionUser } from '../auth/session';

@Controller('programs')
export class ProgramsController {
  constructor(
    private readonly programs: ProgramsService,
    private readonly shares: ProgramShareService,
  ) {}

  @Post()
  create(@Body() dto: CreateProgramDto) {
    return this.programs.create(dto);
  }

  @Get()
  list(@Query('ownerId') ownerId: string) {
    return this.programs.findByOwner(ownerId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() me: SessionUser) {
    return this.shares.findVisible(id, me.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProgramDto) {
    return this.programs.update(id, dto);
  }

  /** Copy this program into a friend's (or your own) library. */
  @Post(':id/copy')
  copy(@Param('id') id: string, @Body() dto: CopyProgramDto, @CurrentUser() me: SessionUser) {
    return this.programs.copy(id, dto, me.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Body() dto: DeleteProgramDto) {
    await this.programs.delete(id, dto.ownerId);
    return { ok: true };
  }
}
