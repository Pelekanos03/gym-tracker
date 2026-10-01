import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BodyWeightEntry } from '../domain/body-weight-entry.entity';
import { UsersService } from '../users/users.service';
import { LogBodyWeightDto } from './dto/log-body-weight.dto';

@Injectable()
export class BodyWeightService {
  constructor(
    @InjectRepository(BodyWeightEntry)
    private readonly entries: Repository<BodyWeightEntry>,
    private readonly users: UsersService,
  ) {}

  /** Oldest first — the order a trend chart wants. */
  forUser(userId: string): Promise<BodyWeightEntry[]> {
    return this.entries.find({ where: { user: { id: userId } }, order: { date: 'ASC' } });
  }

  /** Logs a reading; a second one on the same day replaces the first. */
  async log(userId: string, dto: LogBodyWeightDto): Promise<BodyWeightEntry> {
    const date = dto.date.slice(0, 10);
    const existing = await this.entries.findOne({ where: { user: { id: userId }, date } });
    if (existing) {
      existing.weight = dto.weight;
      return this.entries.save(existing);
    }
    const entry = this.entries.create({ user: await this.users.findById(userId), date, weight: dto.weight });
    return this.entries.save(entry);
  }

  async delete(userId: string, id: string): Promise<void> {
    const entry = await this.entries.findOne({ where: { id }, relations: { user: true } });
    if (!entry) throw new NotFoundException('Entry not found');
    if (entry.user.id !== userId) throw new ForbiddenException('That entry is not yours');
    await this.entries.remove(entry);
  }
}
