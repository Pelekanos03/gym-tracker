import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/user.entity';
import { hashPassword } from '../common/password';
import { CreateUserDto } from './dto/create-user.dto';

/** Emails are matched case-insensitively: "Alex@X.com" and "alex@x.com" are one account. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const email = normalizeEmail(dto.email);
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with that email already exists');
    }

    const user = this.users.create({
      name: dto.name.trim(),
      email,
      passwordHash: hashPassword(dto.password),
      acceptedTermsAt: new Date(),
    });
    return this.users.save(user);
  }

  /** Sets a new password and logs out every existing session. */
  async setPassword(user: User, password: string): Promise<User> {
    user.passwordHash = hashPassword(password);
    user.tokenVersion += 1;
    return this.users.save(user);
  }

  async remove(user: User): Promise<void> {
    await this.users.remove(user);
  }

  findAll(): Promise<User[]> {
    return this.users.find({ order: { createdAt: 'ASC' } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: normalizeEmail(email) } });
  }

  /** Simple substring search over name/email, for finding people to friend. */
  async search(q: string): Promise<User[]> {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const all = await this.users.find({ order: { name: 'ASC' } });
    return all
      .filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query),
      )
      .slice(0, 20);
  }
}
