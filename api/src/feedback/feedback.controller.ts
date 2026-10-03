import { Body, Controller, ForbiddenException, Get, Headers, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Repository } from 'typeorm';
import { Feedback } from '../domain/feedback.entity';
import { CurrentUser } from '../auth/auth.decorators';
import type { SessionUser } from '../auth/session';
import { UsersService } from '../users/users.service';
import { isAdmin } from './admins';

class SendFeedbackDto {
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  page?: string;
}

@Controller('feedback')
export class FeedbackController {
  constructor(
    @InjectRepository(Feedback) private readonly feedback: Repository<Feedback>,
    private readonly users: UsersService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  async send(
    @CurrentUser() me: SessionUser,
    @Body() dto: SendFeedbackDto,
    @Headers('user-agent') userAgent = '',
  ) {
    const user = await this.users.findById(me.id);
    await this.feedback.save(
      this.feedback.create({
        user,
        message: dto.message.trim(),
        page: dto.page ?? '',
        userAgent: userAgent.slice(0, 300),
      }),
    );
    return { ok: true };
  }

  /** Everything testers have sent, newest first — for the app's admins (ADMIN_EMAILS) only. */
  @Get()
  async list(@CurrentUser() me: SessionUser) {
    const user = await this.users.findById(me.id);
    if (!isAdmin(user.email)) throw new ForbiddenException();
    const rows = await this.feedback.find({ order: { createdAt: 'DESC' }, take: 500 });
    return rows.map((f) => ({
      id: f.id,
      from: { name: f.user.name, email: f.user.email },
      message: f.message,
      page: f.page,
      userAgent: f.userAgent,
      createdAt: f.createdAt,
    }));
  }
}
