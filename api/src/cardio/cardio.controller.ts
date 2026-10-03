import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CARDIO_ACTIVITIES,
  CardioSession,
  MAX_OWN_ACTIVITIES,
} from '../domain/cardio-session.entity';
import { User } from '../domain/user.entity';
import { CardioDto, OwnActivitiesDto } from './dto/cardio.dto';

const BUILT_IN = new Set<string>(CARDIO_ACTIVITIES);

/** Each name once, ignoring case; built-in keys ("run") never count as your own. */
function dedupe(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter((n) => {
    const key = n.toLowerCase();
    if (!n || BUILT_IN.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A user's own cardio log. (userId in the path is pinned to the session user by AuthGuard.) */
@Controller('users/:userId/cardio')
export class CardioController {
  constructor(
    @InjectRepository(CardioSession) private readonly cardio: Repository<CardioSession>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** Your own activities (only ever yours — nobody else's list is visible to you). */
  @Get('activities')
  async activities(@Param('userId', ParseUUIDPipe) userId: string) {
    const user = await this.users.findOneByOrFail({ id: userId });
    return user.cardioActivities ?? [];
  }

  /**
   * Replace your list — how one is added or removed. Removing one only
   * hides its chip: sessions already logged with it keep their name.
   */
  @Put('activities')
  async setActivities(@Param('userId', ParseUUIDPipe) userId: string, @Body() dto: OwnActivitiesDto) {
    const activities = dedupe(dto.activities);
    await this.users.update(userId, { cardioActivities: activities });
    return activities;
  }

  /** Newest first. */
  @Get()
  list(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.cardio.find({ where: { user: { id: userId } }, order: { date: 'DESC', createdAt: 'DESC' } });
  }

  @Post()
  async create(@Param('userId', ParseUUIDPipe) userId: string, @Body() dto: CardioDto) {
    const saved = await this.cardio.save(this.cardio.create({ ...clean(dto), user: { id: userId } }));
    await this.remember(userId, saved.activity);
    return this.cardio.findOneByOrFail({ id: saved.id });
  }

  @Put(':id')
  async update(@Param('userId', ParseUUIDPipe) userId: string, @Param('id') id: string, @Body() dto: CardioDto) {
    const row = await this.owned(userId, id);
    return this.cardio.save(Object.assign(row, clean(dto)));
  }

  @Delete(':id')
  async remove(@Param('userId', ParseUUIDPipe) userId: string, @Param('id') id: string) {
    await this.cardio.remove(await this.owned(userId, id));
    return { ok: true };
  }

  /** Logging your own activity puts it on your list (if there's room), so it's there on every device. */
  private async remember(userId: string, activity: string): Promise<void> {
    if (BUILT_IN.has(activity)) return;
    const user = await this.users.findOneByOrFail({ id: userId });
    const list = user.cardioActivities ?? [];
    if (list.length >= MAX_OWN_ACTIVITIES || list.some((a) => a.toLowerCase() === activity.toLowerCase())) return;
    await this.users.update(userId, { cardioActivities: [...list, activity] });
  }

  private async owned(userId: string, id: string): Promise<CardioSession> {
    const row = await this.cardio.findOne({ where: { id }, relations: { user: true } });
    if (!row) throw new NotFoundException('Cardio session not found');
    if (row.user.id !== userId) throw new ForbiddenException();
    return row;
  }
}

function clean(dto: CardioDto) {
  return {
    date: dto.date.slice(0, 10),
    activity: dto.activity,
    durationSeconds: dto.durationSeconds,
    distanceKm: dto.distanceKm ?? null,
    avgHeartRate: dto.avgHeartRate ?? null,
    calories: dto.calories ?? null,
    notes: dto.notes?.trim() ?? '',
  };
}
