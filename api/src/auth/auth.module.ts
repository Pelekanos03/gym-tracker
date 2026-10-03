import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { SESSION_TTL_SECONDS, jwtSecret } from './session';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResetToken } from '../domain/password-reset-token.entity';
import { Mailer } from '../common/mailer';

@Global()
@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([PasswordResetToken]),
    JwtModule.registerAsync({
      useFactory: () => ({ secret: jwtSecret(), signOptions: { expiresIn: SESSION_TTL_SECONDS } }),
    }),
    // A generous default for everything; login sets its own tighter limit.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
  ],
  providers: [
    AuthService,
    Mailer,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
