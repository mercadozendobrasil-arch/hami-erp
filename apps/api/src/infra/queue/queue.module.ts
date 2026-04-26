import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { SHOPEE_AUTH_REFRESH_QUEUE } from 'src/common/shopee.constants';

import {
  ShopeeAuthRefreshProcessor,
  ShopeeAuthRefreshQueueService,
} from './shopee-auth-refresh.queue';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SHOPEE_AUTH_REFRESH_QUEUE,
    }),
  ],
  providers: [ShopeeAuthRefreshQueueService, ShopeeAuthRefreshProcessor],
  exports: [ShopeeAuthRefreshQueueService],
})
export class QueueModule {}
