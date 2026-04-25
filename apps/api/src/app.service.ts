import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: process.env.APP_NAME ?? 'shopee-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
