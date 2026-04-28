import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobStatus, Prisma, WebhookStatus } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';
import {
  ORDER_SYNC_JOB,
  ORDER_SYNC_QUEUE,
  WEBHOOK_EVENT_JOB,
  WEBHOOK_EVENT_QUEUE,
} from 'src/infra/queue/queue.constants';
import { WebhookSdk } from 'src/shopee-sdk/modules/webhook.sdk';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly webhookSdk: WebhookSdk,
    @InjectQueue(WEBHOOK_EVENT_QUEUE)
    private readonly webhookEventQueue: Queue,
    @InjectQueue(ORDER_SYNC_QUEUE)
    private readonly orderSyncQueue: Queue,
  ) {}

  async ingestWebhook(params: {
    signature?: string;
    rawBody?: string;
    payload: Record<string, unknown>;
  }) {
    if (!params.signature) {
      throw new UnauthorizedException('Missing Shopee webhook signature.');
    }

    if (!params.rawBody) {
      throw new BadRequestException(
        'Webhook raw body is unavailable. Ensure the route preserves raw request bytes before JSON parsing.',
      );
    }

    if (!this.webhookSdk.verifySignature(params.rawBody, params.signature)) {
      throw new UnauthorizedException('Invalid Shopee webhook signature.');
    }

    const event = this.webhookSdk.parseEvent(params.payload);
    const shop =
      event.shopId === null
        ? null
        : await this.prismaService.shopeeShop.findUnique({
            where: {
              shopId: BigInt(event.shopId),
            },
          });

    try {
      const webhookEvent = await this.prismaService.webhookEvent.create({
        data: {
          topic: event.topic,
          eventId: event.eventId,
          shopRef: shop?.id,
          payload: event.payload as Prisma.InputJsonValue,
        },
      });

      await this.webhookEventQueue.add(
        WEBHOOK_EVENT_JOB,
        {
          webhookEventId: webhookEvent.id,
        },
        {
          jobId: webhookEvent.id,
          attempts: 3,
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );

      return {
        accepted: true,
        duplicate: false,
        eventId: webhookEvent.eventId,
        webhookEventId: webhookEvent.id,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingEvent = event.eventId
          ? await this.prismaService.webhookEvent.findUnique({
              where: {
                eventId: event.eventId,
              },
            })
          : null;

        return {
          accepted: true,
          duplicate: true,
          eventId: existingEvent?.eventId ?? event.eventId,
          webhookEventId: existingEvent?.id ?? null,
        };
      }

      throw error;
    }
  }

  async processStoredEvent(webhookEventId: string) {
    const webhookEvent = await this.prismaService.webhookEvent.findUnique({
      where: {
        id: webhookEventId,
      },
      include: {
        shop: true,
      },
    });

    if (!webhookEvent) {
      throw new BadRequestException(
        `Webhook event ${webhookEventId} not found.`,
      );
    }

    if (!webhookEvent.topic.toLowerCase().includes('order')) {
      await this.markProcessed(webhookEventId);
      return {
        handled: true,
        routedTo: null,
      };
    }

    const payload = webhookEvent.payload as Record<string, unknown>;
    const orderSn = this.pickString(payload, [
      'ordersn',
      'order_sn',
      'orderSn',
    ]);
    const shopId =
      webhookEvent.shop?.shopId?.toString() ??
      this.pickString(payload, ['shop_id', 'shopId', 'shopid']);

    if (!orderSn || !shopId) {
      await this.markProcessed(webhookEventId);
      return {
        handled: true,
        routedTo: null,
        todo: 'Webhook payload is missing order_sn or shop_id for order sync.',
      };
    }

    const jobRecord = await this.prismaService.jobRecord.create({
      data: {
        queueName: ORDER_SYNC_QUEUE,
        jobName: ORDER_SYNC_JOB,
        payload: {
          source: 'webhook',
          webhookEventId,
          shopId,
          orderSn,
        } satisfies Prisma.InputJsonValue,
      },
    });

    await this.orderSyncQueue.add(
      ORDER_SYNC_JOB,
      {
        jobRecordId: jobRecord.id,
        shopId,
        orderSn,
      },
      {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    await this.prismaService.jobRecord.update({
      where: {
        id: jobRecord.id,
      },
      data: {
        status: JobStatus.PENDING,
      },
    });

    await this.markProcessed(webhookEventId);

    return {
      handled: true,
      routedTo: ORDER_SYNC_QUEUE,
    };
  }

  private async markProcessed(webhookEventId: string) {
    await this.prismaService.webhookEvent.update({
      where: {
        id: webhookEventId,
      },
      data: {
        status: WebhookStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }

  private pickString(
    source: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'string' && value.length > 0) {
        return value;
      }

      if (typeof value === 'number' || typeof value === 'bigint') {
        return String(value);
      }
    }

    return null;
  }
}
