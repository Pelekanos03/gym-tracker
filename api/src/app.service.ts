import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'gym-app API',
      description:
        'Powerlifting & bodybuilding coaching platform. Coaches build programs for their clients and track what they actually do.',
      status: 'ok',
    };
  }
}
