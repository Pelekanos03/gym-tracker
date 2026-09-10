import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from '../common/enums';
import { toPublicUser } from './user.view';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return toPublicUser(await this.users.create(dto));
  }

  @Get()
  async list(@Query('role') role?: UserRole) {
    const users = await this.users.findAll(role);
    return users.map(toPublicUser);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return toPublicUser(await this.users.findById(id));
  }
}
