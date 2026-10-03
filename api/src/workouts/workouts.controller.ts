import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/auth.decorators';
import type { SessionUser } from '../auth/session';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { MAX_VIDEO_BYTES, VIDEO_DIR, safeVideoExtension } from '../common/uploads';
import { WorkoutsService } from './workouts.service';
import { LogSessionDto } from './dto/log-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { DeleteSessionDto } from './dto/delete-session.dto';
import { VideoNoteDto } from './dto/video-note.dto';

@Controller()
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  /** Log a session. */
  @Post('workout-sessions')
  log(@Body() dto: LogSessionDto) {
    return this.workouts.log(dto);
  }

  /** A user's own history. */
  @Get('users/:userId/workout-sessions')
  myHistory(@Param('userId') userId: string) {
    return this.workouts.historyForUser(userId);
  }

  /** A friend's history (requires an accepted friendship). */
  @Get('users/:viewerId/friends/:friendId/workout-sessions')
  friendHistory(
    @Param('viewerId') viewerId: string,
    @Param('friendId') friendId: string,
  ) {
    return this.workouts.historyForFriend(viewerId, friendId);
  }

  @Get('workout-sessions/:id')
  get(@Param('id') id: string, @CurrentUser() me: SessionUser) {
    return this.workouts.findVisible(id, me.id);
  }

  /**
   * Streams a set's video to the lifter or their coach. sendFile handles
   * Range requests, so seeking works and phones don't download it all first.
   */
  @Get('set-logs/:id/video')
  async streamVideo(
    @Param('id') id: string,
    @CurrentUser() me: SessionUser,
    @Res() res: Response,
  ) {
    const path = await this.workouts.videoPathFor(id, me.id);
    res.sendFile(path, {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; media-src 'self'",
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  @Patch('workout-sessions/:id')
  update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.workouts.update(id, dto);
  }

  @Delete('workout-sessions/:id')
  async delete(@Param('id') id: string, @Body() dto: DeleteSessionDto) {
    await this.workouts.delete(id, dto.userId);
    return { ok: true };
  }

  /**
   * Upload a video of one logged set (multipart field "video"). Replaces
   * any video the set already had.
   */
  @Post('set-logs/:id/video')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: VIDEO_DIR,
        filename: (_req, file, cb) =>
          cb(null, randomUUID() + safeVideoExtension(file.originalname)),
      }),
      limits: { fileSize: MAX_VIDEO_BYTES },
      fileFilter: (_req, file, cb) =>
        file.mimetype.startsWith('video/')
          ? cb(null, true)
          : cb(new BadRequestException('Only video files can be uploaded'), false),
    }),
  )
  async uploadVideo(
    @Param('id') id: string,
    @Query('userId', ParseUUIDPipe) userId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('Attach a video in the "video" field');
    const set = await this.workouts.attachVideo(id, userId, file.filename);
    return { id: set.id, videoFile: set.videoFile };
  }

  @Patch('set-logs/:id/video-note')
  async videoNote(@Param('id') id: string, @Body() dto: VideoNoteDto) {
    const set = await this.workouts.setVideoNote(id, dto.userId, dto.note);
    return { id: set.id, videoNote: set.videoNote };
  }

  @Delete('set-logs/:id/video')
  async removeVideo(@Param('id') id: string, @Body() dto: DeleteSessionDto) {
    await this.workouts.removeVideo(id, dto.userId);
    return { ok: true };
  }
}
