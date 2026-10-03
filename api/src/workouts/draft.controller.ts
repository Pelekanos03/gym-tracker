import { Body, Controller, Delete, Get, HttpCode, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsObject } from 'class-validator';
import { Repository } from 'typeorm';
import { WorkoutDraft } from '../domain/workout-draft.entity';
import { CurrentUser } from '../auth/auth.decorators';
import type { SessionUser } from '../auth/session';

class SaveDraftDto {
  @IsObject()
  data: Record<string, unknown>;
}

/** Big enough for a long session; stops the endpoint being used as free storage. */
const MAX_DRAFT_CHARS = 200_000;

/** The logged-in user's workout in progress. */
@Controller('workout-draft')
export class DraftController {
  constructor(@InjectRepository(WorkoutDraft) private readonly drafts: Repository<WorkoutDraft>) {}

  @Get()
  async get(@CurrentUser() me: SessionUser) {
    const draft = await this.drafts.findOne({ where: { user: { id: me.id } } });
    return draft ? { data: JSON.parse(draft.data), updatedAt: draft.updatedAt } : null;
  }

  @Put()
  @HttpCode(200)
  async save(@CurrentUser() me: SessionUser, @Body() dto: SaveDraftDto) {
    const data = JSON.stringify(dto.data);
    if (data.length > MAX_DRAFT_CHARS) return { ok: false, reason: 'too large' };
    const existing = await this.drafts.findOne({ where: { user: { id: me.id } } });
    const draft = existing ?? this.drafts.create({ user: { id: me.id } });
    draft.data = data;
    const saved = await this.drafts.save(draft);
    return { ok: true, updatedAt: saved.updatedAt };
  }

  @Delete()
  async clear(@CurrentUser() me: SessionUser) {
    await this.drafts.delete({ user: { id: me.id } });
    return { ok: true };
  }
}
