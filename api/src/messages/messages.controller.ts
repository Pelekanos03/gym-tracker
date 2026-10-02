import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { CHAT_DIR, INLINE_ATTACHMENT, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_MB, attachmentKind } from '../common/uploads';
import { CurrentUser } from '../auth/auth.decorators';
import type { SessionUser } from '../auth/session';
import { MessagesService } from './messages.service';

class SendMessageDto {
  @IsUUID()
  toUserId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}

/** The text sent along with a file — optional. */
class SendAttachmentDto {
  @IsUUID()
  toUserId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;
}

/**
 * Multer reads the file name as latin1; browsers send UTF-8. Re-decode so
 * "Πρόγραμμα.pdf" doesn't arrive as mojibake.
 */
function utf8Name(name: string): string {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}

/** Content-Disposition with an ASCII fallback and the real (UTF-8) name for browsers that read it. */
function disposition(kind: 'inline' | 'attachment', name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('contacts')
  contacts(@CurrentUser() me: SessionUser) {
    return this.messages.contacts(me.id);
  }

  @Get('unread-count')
  async unread(@CurrentUser() me: SessionUser) {
    return { count: await this.messages.unreadCount(me.id) };
  }

  @Get('with/:otherId')
  conversation(
    @CurrentUser() me: SessionUser,
    @Param('otherId', ParseUUIDPipe) other: string,
    @Query('before') before?: string,
  ) {
    return this.messages.conversation(me.id, other, before);
  }

  /** 30 a minute: plenty for a conversation, too slow to spam someone. */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  send(@CurrentUser() me: SessionUser, @Body() dto: SendMessageDto) {
    return this.messages.send(me.id, dto.toUserId, dto.body);
  }

  /** Send a file (multipart field "file"), with optional text in "body". */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('attachment')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: CHAT_DIR,
        // Random name + the allow-listed extension; the original name is only ever shown, never used on disk.
        filename: (_req, file, cb) => cb(null, randomUUID() + (attachmentKind(utf8Name(file.originalname))?.ext ?? '')),
      }),
      limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
      fileFilter: (_req, file, cb) =>
        attachmentKind(utf8Name(file.originalname))
          ? cb(null, true)
          : cb(
              new BadRequestException(
                "That kind of file can't be sent. Photos, PDFs, Word/Excel/PowerPoint, text, video, audio and zip files are fine.",
              ),
              false,
            ),
    }),
  )
  sendAttachment(
    @CurrentUser() me: SessionUser,
    @Body() dto: SendAttachmentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException(`Attach a file (up to ${MAX_ATTACHMENT_MB} MB)`);
    const name = utf8Name(file.originalname);
    return this.messages.sendAttachment(me.id, dto.toUserId, dto.body ?? '', {
      file: file.filename,
      name,
      type: attachmentKind(name)!.type,
      size: file.size,
    });
  }

  /**
   * The file sent with a message, to the sender or recipient only. Photos
   * show inline; anything else downloads — and the CSP means nothing in it
   * can run as part of this site.
   */
  @Get(':id/attachment')
  async attachment(
    @CurrentUser() me: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const a = await this.messages.attachmentFor(id, me.id);
    const inline = INLINE_ATTACHMENT.test(a.type);
    res.sendFile(a.path, {
      headers: {
        'Content-Type': a.type,
        'Content-Disposition': disposition(inline ? 'inline' : 'attachment', a.name),
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self'; media-src 'self'; sandbox",
        'Cache-Control': 'private, max-age=86400',
      },
    });
  }
}
