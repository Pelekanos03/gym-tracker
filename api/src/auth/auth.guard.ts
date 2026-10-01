import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC } from './auth.decorators';
import { SESSION_COOKIE, SessionUser } from './session';
import { UsersService } from '../users/users.service';

/**
 * The request fields through which a client says "I am user X, do this".
 * They predate real sessions; rather than rewrite every route, the guard
 * pins them: whenever one is present it must be the logged-in user.
 * Ids that name *someone else* (friendId, toUserId, clientId, …) are
 * deliberately not listed — the services check the relationship.
 */
const ACTOR_PARAMS = ['userId', 'viewerId'];
const ACTOR_QUERY = ['userId', 'ownerId'];
const ACTOR_BODY = ['userId', 'ownerId', 'fromUserId', 'coachId'];

/** Global: every route needs a valid session unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly users: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])
    ) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<Request & { user?: SessionUser }>();
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Please log in');

    let payload: { sub?: string; ver?: number };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Your session has expired — please log in again');
    }
    if (!payload.sub) throw new UnauthorizedException('Please log in');
    // A deleted account, or a password changed since this token was
    // issued (tokenVersion bumped), ends the session.
    const user = await this.users.findById(payload.sub).catch(() => null);
    if (!user || (payload.ver ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Your session has ended — please log in again');
    }
    req.user = { id: user.id };

    const claimed = [
      ...ACTOR_PARAMS.map((k) => (req.params as Record<string, unknown>)?.[k]),
      ...ACTOR_QUERY.map((k) => (req.query as Record<string, unknown>)?.[k]),
      ...ACTOR_BODY.map((k) => (req.body as Record<string, unknown> | undefined)?.[k]),
    ].filter((v) => v !== undefined);
    if (claimed.some((v) => v !== payload.sub)) {
      throw new ForbiddenException("You can only do that as yourself");
    }
    return true;
  }
}
