import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { StartBlockDto } from './dto/start-block.dto';
import { BlockOwnerDto } from './dto/block-owner.dto';

@Controller()
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  /** Start running a program — also how the user switches block (finishes any block already active). */
  @Post('training-blocks')
  start(@Body() dto: StartBlockDto) {
    return this.blocks.start(dto.userId, dto.programId);
  }

  /** The user's current block with its progress, or null. */
  @Get('users/:userId/training-blocks/active')
  active(@Param('userId') userId: string) {
    return this.blocks.active(userId);
  }

  @Post('training-blocks/:id/end')
  end(@Param('id') id: string, @Body() dto: BlockOwnerDto) {
    return this.blocks.end(id, dto.userId);
  }
}
