import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JobStatus, Prisma } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';
import { ORDER_SYNC_QUEUE } from 'src/infra/queue/queue.constants';
import { OrderSdk } from 'src/shopee-sdk/modules/order.sdk';

@Processor(ORDER_SYNC_QUEUE)
export class OrdersSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(OrdersSyncProcessor.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly orderSdk: OrderSdk,
  ) {
    super();
  }

  async process(
    job: Job<{ jobRecordId: string; shopId: string; orderSn: string }>,
  ): Promise<Record<string, unknown>> {
    await this.prismaService.jobRecord.update({
      where: {
        id: job.data.jobRecordId,
      },
      data: {
        status: JobStatus.PROCESSING,
      },
    });

    try {
      const order = await this.orderSdk.getOrderDetail(
        job.data.shopId,
        job.data.orderSn,
      );

      await this.prismaService.jobRecord.update({
        where: {
          id: job.data.jobRecordId,
        },
        data: {
          status: JobStatus.COMPLETED,
          processedAt: new Date(),
          result: JSON.parse(
            JSON.stringify({
              orderSn: job.data.orderSn,
              syncedAt: new Date().toISOString(),
              order,
              todo: 'Persist into a dedicated order projection once schema fields are available.',
            }),
          ) as Prisma.InputJsonValue,
        },
      });

      return {
        orderSn: job.data.orderSn,
        order,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown order sync error.';

      this.logger.error(
        `Failed to sync order ${job.data.orderSn} for shop ${job.data.shopId}: ${message}`,
      );

      await this.prismaService.jobRecord.update({
        where: {
          id: job.data.jobRecordId,
        },
        data: {
          status: JobStatus.FAILED,
          processedAt: new Date(),
          errorMessage: message,
        },
      });

      throw error;
    }
  }
}
