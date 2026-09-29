import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingBlock } from '../domain/training-block.entity';
import { BlocksService } from './blocks.service';
import { BlocksController } from './blocks.controller';
import { UsersModule } from '../users/users.module';
import { ProgramsModule } from '../programs/programs.module';

@Module({
  imports: [TypeOrmModule.forFeature([TrainingBlock]), UsersModule, ProgramsModule],
  providers: [BlocksService],
  controllers: [BlocksController],
  exports: [BlocksService],
})
export class BlocksModule {}
