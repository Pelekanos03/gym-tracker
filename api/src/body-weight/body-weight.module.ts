import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BodyWeightEntry } from '../domain/body-weight-entry.entity';
import { UsersModule } from '../users/users.module';
import { BodyWeightService } from './body-weight.service';
import { BodyWeightController } from './body-weight.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BodyWeightEntry]), UsersModule],
  providers: [BodyWeightService],
  controllers: [BodyWeightController],
})
export class BodyWeightModule {}
