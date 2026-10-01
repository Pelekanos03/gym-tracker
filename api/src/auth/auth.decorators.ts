import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { SessionUser } from './session';

export const IS_PUBLIC = 'isPublic';

/** Opts a route out of the login requirement (login, sign-up, …). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** The logged-in user, as established by AuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser =>
    ctx.switchToHttp().getRequest<{ user: SessionUser }>().user,
);
