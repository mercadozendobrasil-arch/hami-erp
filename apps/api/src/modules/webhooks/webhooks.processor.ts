import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WebhookStatus } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';
import { WEBHOOK_EVENT_QUEUE } from 'src/infra/queue/queue.constants';

import { WebhooksService } from './webhooks.service';

@Processor(WEBHOOK_EVENT_QUEUE)
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly webhooksService: WebhooksService,
  ) {
    super();
  }

  async process(job: Job<{ webhookEventId: string }>) {
    try {
      return await this.webhooksService.processStoredEvent(
        job.data.webhookEventId,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown webhook processing error.';

      this.logger.error(
        `Failed to process webhook event ${job.data.webhookEventId}: ${message}`,
      );

      await this.prismaService.webhookEvent.update({
        where: {
          id: job.data.webhookEventId,
        },
        data: {
          status: WebhookStatus.FAILED,
        },
      });

      throw error;
    }
  }
}
