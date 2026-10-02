import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardioSession } from '../domain/cardio-session.entity';
import { User } from '../domain/user.entity';
import { CardioController } from './cardio.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CardioSession, User])],
  controllers: [CardioController],
})
export class CardioModule {}
