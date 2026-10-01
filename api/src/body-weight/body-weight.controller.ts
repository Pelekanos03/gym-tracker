import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { BodyWeightService } from './body-weight.service';
import { LogBodyWeightDto } from './dto/log-body-weight.dto';

@Controller('users/:userId/body-weight')
export class BodyWeightController {
  constructor(private readonly bodyWeight: BodyWeightService) {}

  @Get()
  list(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.bodyWeight.forUser(userId);
  }

  @Post()
  log(@Param('userId', ParseUUIDPipe) userId: string, @Body() dto: LogBodyWeightDto) {
    return this.bodyWeight.log(userId, dto);
  }

  @Delete(':id')
  async delete(@Param('userId', ParseUUIDPipe) userId: string, @Param('id') id: string) {
    await this.bodyWeight.delete(userId, id);
    return { ok: true };
  }
}
