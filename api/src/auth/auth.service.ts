import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import type { Response } from 'express';
import { LessThan, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User } from '../domain/user.entity';
import { PasswordResetToken } from '../domain/password-reset-token.entity';
import { verifyPassword } from '../common/password';
import { Mailer, appUrl } from '../common/mailer';
import { LoginDto } from './dto/login.dto';
import { SESSION_COOKIE, sessionCookieOptions } from './session';

/** How long a "reset your password" link works. */
const RESET_TTL_MS = 60 * 60 * 1000;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  private readonly log = new Logger('Auth');

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly mailer: Mailer,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
  ) {}

  async login(dto: LoginDto): Promise<User> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }

  /**
   * Signs a session token and sets it as the session cookie. `ver` ties it
   * to the user's tokenVersion, so a password change logs out old sessions.
   */
  async startSession(res: Response, user: User): Promise<void> {
    const token = await this.jwt.signAsync({ sub: user.id, ver: user.tokenVersion });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  }

  endSession(res: Response): void {
    const { maxAge: _maxAge, ...opts } = sessionCookieOptions();
    res.clearCookie(SESSION_COOKIE, opts);
  }

  /**
   * Emails a one-hour reset link. Says nothing about whether the email
   * has an account — the caller always gets the same answer, so this
   * can't be used to find out who's signed up.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    await this.resetTokens.delete({ expiresAt: LessThan(new Date()) });
    if (!user) return;

    const token = randomBytes(32).toString('base64url');
    await this.resetTokens.save(
      this.resetTokens.create({
        user,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      }),
    );
    const link = `${appUrl()}/reset-password?token=${token}`;
    try {
      await this.mailer.send(
        user.email,
        'Reset your password',
        `Hi ${user.name},\n\nSomeone (hopefully you) asked to reset your training log password.\n` +
          `Open this link within the next hour to choose a new one:\n\n${link}\n\n` +
          `If it wasn't you, ignore this email — your password stays the same.`,
      );
    } catch (err) {
      // Don't reveal mail trouble to the caller (it would leak that the account exists).
      this.log.error(`Could not send reset email: ${(err as Error).message}`);
    }
  }

  /** Uses a reset link: sets the new password, and every old session stops working. */
  async resetPassword(token: string, password: string): Promise<User> {
    const row = await this.resetTokens.findOne({ where: { tokenHash: sha256(token) } });
    if (!row || row.expiresAt.getTime() < Date.now()) {
      if (row) await this.resetTokens.remove(row);
      throw new BadRequestException('This reset link is invalid or has expired — request a new one.');
    }
    const user = await this.users.setPassword(row.user, password);
    await this.resetTokens.delete({ user: { id: user.id } });
    return user;
  }
}
