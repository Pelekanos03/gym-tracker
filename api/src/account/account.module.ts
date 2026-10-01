import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Module({
  imports: [UsersModule],
  providers: [AccountService],
  controllers: [AccountController],
})
export class AccountModule {}
