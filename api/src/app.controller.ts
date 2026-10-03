import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/auth.decorators';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getInfo() {
    return this.appService.getInfo();
  }

  /** Liveness probe for Docker / uptime monitors — no login needed. */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
