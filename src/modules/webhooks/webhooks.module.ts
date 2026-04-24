import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { ShopeeAuthService } from 'src/common/shopee-auth.service';
import { ShopeeSignatureService } from 'src/common/shopee-signature.service';
import {
  ORDER_SYNC_QUEUE,
  WEBHOOK_EVENT_QUEUE,
} from 'src/infra/queue/queue.constants';
import { WebhookSdk } from 'src/shopee-sdk/modules/webhook.sdk';

import { shopeeWebhookRawBodyMiddleware } from './raw-body.middleware';
import { WebhooksController } from './webhooks.controller';
import { WebhooksProcessor } from './webhooks.processor';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: WEBHOOK_EVENT_QUEUE,
      },
      {
        name: ORDER_SYNC_QUEUE,
      },
    ),
  ],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhooksProcessor,
    WebhookSdk,
    ShopeeAuthService,
    ShopeeSignatureService,
  ],
})
export class WebhooksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(shopeeWebhookRawBodyMiddleware)
      .forRoutes(WebhooksController);
  }
}
