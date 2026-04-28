import { BadRequestException } from '@nestjs/common';

import { ErpOrderActionsService } from '../src/erp/orders/erp-order-actions.service';

describe('ErpOrderActionsService', () => {
  const createService = () => {
    const txClient = {
      erpOrderProjection: {
        upsert: jest.fn(),
      },
      erpOrderOperationLog: {
        create: jest.fn(),
      },
    };

    const prismaService = {
      $transaction: jest.fn(async (callback: (tx: typeof txClient) => unknown) =>
        callback(txClient),
      ),
      erpOrderProjection: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      erpOrderOperationLog: {
        create: jest.fn(),
      },
    };

    const orderSdk = {
      setNote: jest.fn(),
      cancelOrder: jest.fn(),
    };

    const service = new ErpOrderActionsService(
      prismaService as never,
      orderSdk as never,
    );

    return {
      service,
      prismaService,
      txClient,
      orderSdk,
    };
  };

  it('rejects split requests that include the parent order in the child list', async () => {
    const { service, prismaService } = createService();

    await expect(
      service.splitOrder('ORDER-1', {
        shopId: '1001',
        childOrderSns: ['ORDER-1', 'ORDER-2'],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('rejects split requests with duplicate child order numbers', async () => {
    const { service, prismaService } = createService();

    await expect(
      service.splitOrder('ORDER-1', {
        shopId: '1001',
        childOrderSns: ['ORDER-2', 'ORDER-2'],
      }),
    ).rejects.toThrow('Duplicate order numbers are not allowed in childOrderSns.');
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('rejects merge requests that include the target order in the source list', async () => {
    const { service, prismaService } = createService();

    await expect(
      service.mergeOrders({
        shopId: '1001',
        targetOrderSn: 'ORDER-1',
        sourceOrderSns: ['ORDER-1', 'ORDER-2'],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('rejects merge requests with duplicate source order numbers', async () => {
    const { service, prismaService } = createService();

    await expect(
      service.mergeOrders({
        shopId: '1001',
        targetOrderSn: 'ORDER-1',
        sourceOrderSns: ['ORDER-2', 'ORDER-2'],
      }),
    ).rejects.toThrow('Duplicate order numbers are not allowed in sourceOrderSns.');
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('executes split writes inside a single transaction', async () => {
    const { service, prismaService, txClient } = createService();

    txClient.erpOrderProjection.upsert
      .mockResolvedValueOnce({ id: 'parent-id' })
      .mockResolvedValueOnce({ id: 'child-1-id' })
      .mockResolvedValueOnce({ id: 'child-2-id' });
    txClient.erpOrderOperationLog.create.mockResolvedValue({ id: 'log-1' });

    const result = await service.splitOrder('ORDER-1', {
      shopId: '1001',
      childOrderSns: ['ORDER-2', 'ORDER-3'],
      splitGroupId: 'group-1',
    });

    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(txClient.erpOrderProjection.upsert).toHaveBeenCalledTimes(3);
    expect(txClient.erpOrderOperationLog.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      data: {
        parentOrderSn: 'ORDER-1',
        splitGroupId: 'group-1',
        childOrderSns: ['ORDER-2', 'ORDER-3'],
        parentId: 'parent-id',
        childIds: ['child-1-id', 'child-2-id'],
      },
    });
  });

  it('marks cancelled orders with the cancelled fulfillment stage', async () => {
    const { service, prismaService, orderSdk } = createService();

    orderSdk.cancelOrder.mockResolvedValue({ ok: true });
    prismaService.erpOrderProjection.upsert.mockResolvedValue({ id: 'projection-1' });
    prismaService.erpOrderOperationLog.create.mockResolvedValue({ id: 'log-1' });

    await service.cancelOrder('ORDER-1', {
      shopId: '1001',
      cancelReason: 'OUT_OF_STOCK',
    });

    expect(prismaService.erpOrderProjection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          orderStatus: 'CANCELLED',
          fulfillmentStage: 'cancelled',
        }),
      }),
    );
  });

  it('does not write the split operation log when a transactional upsert fails', async () => {
    const { service, txClient } = createService();

    txClient.erpOrderProjection.upsert
      .mockResolvedValueOnce({ id: 'parent-id' })
      .mockRejectedValueOnce(new Error('write failed'));

    await expect(
      service.splitOrder('ORDER-1', {
        shopId: '1001',
        childOrderSns: ['ORDER-2', 'ORDER-3'],
      }),
    ).rejects.toThrow('write failed');
    expect(txClient.erpOrderOperationLog.create).not.toHaveBeenCalled();
  });

  it('executes merge writes inside a single transaction', async () => {
    const { service, prismaService, txClient } = createService();

    txClient.erpOrderProjection.upsert
      .mockResolvedValueOnce({ id: 'target-id' })
      .mockResolvedValueOnce({ id: 'source-1-id' })
      .mockResolvedValueOnce({ id: 'source-2-id' });
    txClient.erpOrderOperationLog.create.mockResolvedValue({ id: 'log-1' });

    const result = await service.mergeOrders({
      shopId: '1001',
      targetOrderSn: 'ORDER-1',
      sourceOrderSns: ['ORDER-2', 'ORDER-3'],
    });

    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    expect(txClient.erpOrderProjection.upsert).toHaveBeenCalledTimes(3);
    expect(txClient.erpOrderOperationLog.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      data: {
        targetOrderSn: 'ORDER-1',
        sourceOrderSns: ['ORDER-2', 'ORDER-3'],
        targetId: 'target-id',
        sourceIds: ['source-1-id', 'source-2-id'],
      },
    });
  });
});
