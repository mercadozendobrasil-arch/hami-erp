import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PRODUCT_SYNC_QUEUE } from '../../common/constants/shopee.constants';
import {
  ProductSyncProcessor,
  ProductSyncQueueService,
} from '../../infra/queue/product-sync.queue';
import { ProductAiMediaController } from './product-ai-media.controller';
import { ProductAiMediaService } from './product-ai-media.service';
import { ProductPayloadMapper } from './product-payload.mapper';
import { ProductPublishService } from './product-publish.service';
import { ProductValidationService } from './product-validation.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: PRODUCT_SYNC_QUEUE,
    }),
  ],
  controllers: [ProductsController, ProductAiMediaController],
  providers: [
    ProductsService,
    ProductAiMediaService,
    ProductPublishService,
    ProductPayloadMapper,
    ProductValidationService,
    ProductSyncQueueService,
    ProductSyncProcessor,
  ],
})
export class ProductsModule {}
