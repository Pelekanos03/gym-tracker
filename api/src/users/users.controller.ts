import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { toPublicUser } from './user.view';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return toPublicUser(await this.users.create(dto));
  }

  /** Optional `?q=` searches by name/email substring, for finding people to friend. */
  @Get()
  async list(@Query('q') q?: string) {
    const users = q ? await this.users.search(q) : await this.users.findAll();
    return users.map(toPublicUser);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return toPublicUser(await this.users.findById(id));
  }
}
