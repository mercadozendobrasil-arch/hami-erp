import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

import { PRODUCT_SYNC_QUEUE } from '../../common/constants/shopee.constants';
import { ProductSdk } from '../../shopee-sdk/modules/product.sdk';

export interface ProductSyncJobPayload {
  shopId: number;
  itemId: number;
  accessToken: string;
  trigger: 'manual' | 'publish' | 'update';
}

@Injectable()
export class ProductSyncQueueService {
  constructor(
    @InjectQueue(PRODUCT_SYNC_QUEUE)
    private readonly queue: Queue<ProductSyncJobPayload>,
  ) {}

  enqueue(payload: ProductSyncJobPayload) {
    return this.queue.add('sync-item', payload, {
      removeOnComplete: 50,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}

@Processor(PRODUCT_SYNC_QUEUE)
export class ProductSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ProductSyncProcessor.name);

  constructor(private readonly productSdk: ProductSdk) {
    super();
  }

  async process(job: Job<ProductSyncJobPayload>) {
    const baseInfo = await this.productSdk.getItemBaseInfo(
      {
        shopId: job.data.shopId,
        accessToken: job.data.accessToken,
      },
      [job.data.itemId],
    );
    const extraInfo = await this.productSdk.getItemExtraInfo(
      {
        shopId: job.data.shopId,
        accessToken: job.data.accessToken,
      },
      [job.data.itemId],
    );

    this.logger.log(
      `Synced Shopee item ${job.data.itemId} for shop ${job.data.shopId}`,
    );

    return {
      trigger: job.data.trigger,
      itemId: job.data.itemId,
      shopId: job.data.shopId,
      baseInfo,
      extraInfo,
    };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ProductSyncJobPayload> | undefined, error: Error) {
    this.logger.error(
      `Product sync failed for item ${job?.data.itemId ?? 'unknown'}`,
      error.stack,
    );
  }
}
