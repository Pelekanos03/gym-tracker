import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoachingRelationship } from '../domain/coaching-relationship.entity';
import { CoachingService } from './coaching.service';
import { CoachingController } from './coaching.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([CoachingRelationship]), UsersModule],
  providers: [CoachingService],
  controllers: [CoachingController],
  exports: [CoachingService],
})
export class CoachingModule {}
