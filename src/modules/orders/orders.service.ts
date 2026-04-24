import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';

import { OrderSdk } from 'src/shopee-sdk/modules/order.sdk';
import {
  ORDER_SYNC_JOB,
  ORDER_SYNC_QUEUE,
} from 'src/infra/queue/queue.constants';
import { PrismaService } from 'src/infra/database/prisma.service';

import { OrderListQueryDto } from './dto/order-list-query.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly orderSdk: OrderSdk,
    @InjectQueue(ORDER_SYNC_QUEUE)
    private readonly orderSyncQueue: Queue,
  ) {}

  getOrderList(shopId: string, query: OrderListQueryDto) {
    return this.orderSdk.getOrderList(shopId, query);
  }

  getOrderDetail(shopId: string, orderSn: string) {
    return this.orderSdk.getOrderDetail(shopId, orderSn);
  }

  async syncOrder(shopId: string, orderSn: string) {
    const jobRecord = await this.prismaService.jobRecord.create({
      data: {
        queueName: ORDER_SYNC_QUEUE,
        jobName: ORDER_SYNC_JOB,
        payload: {
          shopId,
          orderSn,
        } satisfies Prisma.InputJsonValue,
      },
    });

    const job = await this.orderSyncQueue.add(
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

    return {
      jobId: job.id,
      recordId: jobRecord.id,
      status: jobRecord.status,
    };
  }
}
