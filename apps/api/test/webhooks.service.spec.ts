import { JobStatus, WebhookStatus } from '@prisma/client';

import { ORDER_SYNC_QUEUE } from '../src/infra/queue/queue.constants';
import { WebhooksService } from '../src/modules/webhooks/webhooks.service';

describe('WebhooksService', () => {
  const createService = () => {
    const prismaService = {
      webhookEvent: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      jobRecord: {
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const webhookSdk = {
      verifySignature: jest.fn(),
      parseEvent: jest.fn(),
    };
    const webhookEventQueue = {
      add: jest.fn(),
    };
    const orderSyncQueue = {
      add: jest.fn(),
    };

    const service = new WebhooksService(
      prismaService as never,
      webhookSdk as never,
      webhookEventQueue as never,
      orderSyncQueue as never,
    );

    return {
      service,
      prismaService,
      webhookSdk,
      webhookEventQueue,
      orderSyncQueue,
    };
  };

  it('marks an order webhook as processed only after the order sync job is queued', async () => {
    const { service, prismaService, orderSyncQueue } = createService();
    const callOrder: string[] = [];

    prismaService.webhookEvent.findUnique.mockResolvedValue({
      id: 'webhook-1',
      topic: 'order_status_update',
      payload: {
        order_sn: 'ORDER-1',
        shop_id: '1001',
      },
      shop: {
        shopId: BigInt(1001),
      },
    });
    prismaService.jobRecord.create.mockImplementation(async ({ data }) => {
      if (data.queueName === ORDER_SYNC_QUEUE) {
        callOrder.push('jobRecord.create');
        return { id: 'job-1' };
      }

      return { id: 'job-ignored' };
    });
    orderSyncQueue.add.mockImplementation(async () => {
      callOrder.push('orderSyncQueue.add');
    });
    prismaService.jobRecord.update.mockImplementation(async () => {
      callOrder.push('jobRecord.update');
    });
    prismaService.webhookEvent.update.mockImplementation(async () => {
      callOrder.push('webhookEvent.update');
    });

    const result = await service.processStoredEvent('webhook-1');

    expect(result).toEqual({
      handled: true,
      routedTo: ORDER_SYNC_QUEUE,
    });
    expect(callOrder).toEqual([
      'jobRecord.create',
      'orderSyncQueue.add',
      'jobRecord.update',
      'webhookEvent.update',
    ]);
    expect(prismaService.webhookEvent.update).toHaveBeenCalledWith({
      where: {
        id: 'webhook-1',
      },
      data: {
        status: WebhookStatus.PROCESSED,
        processedAt: expect.any(Date),
      },
    });
    expect(prismaService.jobRecord.update).toHaveBeenCalledWith({
      where: {
        id: 'job-1',
      },
      data: {
        status: JobStatus.PENDING,
      },
    });
  });

  it('does not mark the webhook as processed when queueing the order sync job fails', async () => {
    const { service, prismaService, orderSyncQueue } = createService();

    prismaService.webhookEvent.findUnique.mockResolvedValue({
      id: 'webhook-1',
      topic: 'order_status_update',
      payload: {
        order_sn: 'ORDER-1',
        shop_id: '1001',
      },
      shop: {
        shopId: BigInt(1001),
      },
    });
    prismaService.jobRecord.create.mockResolvedValue({
      id: 'job-1',
    });
    orderSyncQueue.add.mockRejectedValue(new Error('queue unavailable'));

    await expect(service.processStoredEvent('webhook-1')).rejects.toThrow(
      'queue unavailable',
    );
    expect(prismaService.webhookEvent.update).not.toHaveBeenCalled();
    expect(prismaService.jobRecord.update).not.toHaveBeenCalled();
  });

  it('marks non-order webhooks as processed without routing them to order sync', async () => {
    const { service, prismaService, orderSyncQueue } = createService();

    prismaService.webhookEvent.findUnique.mockResolvedValue({
      id: 'webhook-1',
      topic: 'product_update',
      payload: {},
      shop: null,
    });

    const result = await service.processStoredEvent('webhook-1');

    expect(result).toEqual({
      handled: true,
      routedTo: null,
    });
    expect(orderSyncQueue.add).not.toHaveBeenCalled();
    expect(prismaService.webhookEvent.update).toHaveBeenCalledWith({
      where: {
        id: 'webhook-1',
      },
      data: {
        status: WebhookStatus.PROCESSED,
        processedAt: expect.any(Date),
      },
    });
  });

  it('marks order webhooks with incomplete payload as processed after recording no routing target', async () => {
    const { service, prismaService, orderSyncQueue } = createService();

    prismaService.webhookEvent.findUnique.mockResolvedValue({
      id: 'webhook-1',
      topic: 'order_status_update',
      payload: {},
      shop: null,
    });

    const result = await service.processStoredEvent('webhook-1');

    expect(result).toEqual({
      handled: true,
      routedTo: null,
      todo: 'Webhook payload is missing order_sn or shop_id for order sync.',
    });
    expect(orderSyncQueue.add).not.toHaveBeenCalled();
    expect(prismaService.webhookEvent.update).toHaveBeenCalledWith({
      where: {
        id: 'webhook-1',
      },
      data: {
        status: WebhookStatus.PROCESSED,
        processedAt: expect.any(Date),
      },
    });
  });
});
