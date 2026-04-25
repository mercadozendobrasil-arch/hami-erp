import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { SHOPEE_AUTH_REFRESH_QUEUE } from 'src/common/shopee.constants';
import { AuthSdk } from 'src/shopee-sdk/modules/auth.sdk';

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
  providers: [
    AuthSdk,
    ShopeeAuthRefreshQueueService,
    ShopeeAuthRefreshProcessor,
  ],
  exports: [ShopeeAuthRefreshQueueService],
})
export class QueueModule {}
