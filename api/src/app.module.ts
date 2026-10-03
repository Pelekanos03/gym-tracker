import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source-options';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FriendshipModule } from './friendship/friendship.module';
import { CoachingModule } from './coaching/coaching.module';
import { ExercisesModule } from './exercises/exercises.module';
import { ProgramsModule } from './programs/programs.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { ProgressModule } from './progress/progress.module';
import { BlocksModule } from './blocks/blocks.module';
import { BodyWeightModule } from './body-weight/body-weight.module';
import { AccountModule } from './account/account.module';
import { FeedbackModule } from './feedback/feedback.module';
import { CardioModule } from './cardio/cardio.module';
import { MessagesModule } from './messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    UsersModule,
    AuthModule,
    FriendshipModule,
    CoachingModule,
    ExercisesModule,
    ProgramsModule,
    WorkoutsModule,
    ProgressModule,
    BlocksModule,
    BodyWeightModule,
    AccountModule,
    FeedbackModule,
    CardioModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
