import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../auth/auth.service';
import { CurrentUser, Public } from '../auth/auth.decorators';
import type { SessionUser } from '../auth/session';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { toOtherUser, toPublicUser } from './user.view';

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  /** Sign up — and you're logged in straight away. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  async create(@Body() dto: CreateUserDto, @Res({ passthrough: true }) res: Response) {
    const invite = process.env.SIGNUP_INVITE_CODE;
    if (invite && dto.inviteCode?.trim() !== invite) {
      throw new ForbiddenException('Sign-up is invite-only right now — ask for an invite code.');
    }
    const user = await this.users.create(dto);
    await this.auth.startSession(res, user);
    return toPublicUser(user);
  }

  /**
   * Find people to friend by name/email (`?q=`, 2+ characters, max 20
   * results). There's deliberately no "list everyone" — that would hand
   * any account the full member list and every email address.
   */
  @Get()
  async list(@CurrentUser() me: SessionUser, @Query('q') q?: string) {
    if (!q || q.trim().length < 2) return [];
    const users = await this.users.search(q);
    return users.filter((u) => u.id !== me.id).map(toOtherUser);
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() me: SessionUser) {
    const user = await this.users.findById(id);
    return id === me.id ? toPublicUser(user) : toOtherUser(user);
  }
}
