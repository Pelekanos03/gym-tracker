import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../domain/user.entity';
import { UserRole } from '../common/enums';
import { hashPassword } from '../common/password';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('A user with that email already exists');
    }

    const user = this.users.create({
      name: dto.name,
      email: dto.email,
      role: dto.role,
      passwordHash: hashPassword(dto.password),
    });
    return this.users.save(user);
  }

  findAll(role?: UserRole): Promise<User[]> {
    return this.users.find({
      where: role ? { role } : {},
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Used by other services that need to be sure the id belongs to a coach/client. */
  async requireRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    if (user.role !== role) {
      throw new NotFoundException(`User ${id} is not a ${role.toLowerCase()}`);
    }
    return user;
  }
}
