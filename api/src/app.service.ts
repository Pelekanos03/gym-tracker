import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'gym-app API',
      description:
        'Powerlifting & bodybuilding tracker. Friends build programs, copy each other\'s, and track what they actually do.',
      status: 'ok',
    };
  }
}
