import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';
import { OrderSdk } from 'src/shopee-sdk/modules/order.sdk';

import {
  ErpOrderAfterSaleDto,
  ErpOrderAuditDto,
  ErpOrderCancelDto,
  ErpOrderLockDto,
  ErpOrderLogisticsDto,
  ErpOrderMergeDto,
  ErpOrderNoteDto,
  ErpOrderShopActionDto,
  ErpOrderSplitDto,
  ErpOrderTagsDto,
  ErpOrderWarehouseDto,
} from './dto/erp-order-action.dto';

@Injectable()
export class ErpOrderActionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly orderSdk: OrderSdk,
  ) {}

  async updateNote(orderSn: string, payload: ErpOrderNoteDto) {
    const shopeeResult = await this.orderSdk.setNote(
      payload.shopId,
      orderSn,
      payload.remark,
    );
    const projection = await this.upsertManualState(payload.shopId, orderSn, {
      remark: payload.remark,
    });

    await this.recordOrderLog({
      shopId: payload.shopId,
      orderSn,
      action: 'UPDATE_NOTE',
      status: 'SUCCESS',
      request: payload,
      response: { projectionId: projection.id, shopeeResult },
    });

    return this.success({ projection, shopeeResult });
  }

  async lockOrder(orderSn: string, payload: ErpOrderLockDto) {
    return this.setLockState(orderSn, payload, true, 'LOCK_ORDER');
  }

  async unlockOrder(orderSn: string, payload: ErpOrderLockDto) {
    return this.setLockState(orderSn, payload, false, 'UNLOCK_ORDER');
  }

  async auditOrder(orderSn: string, payload: ErpOrderAuditDto) {
    return this.updateLocalAction(orderSn, payload, 'AUDIT_ORDER', {
      auditStatus: 'APPROVED',
    });
  }

  async reverseAuditOrder(orderSn: string, payload: ErpOrderAuditDto) {
    return this.updateLocalAction(orderSn, payload, 'REVERSE_AUDIT_ORDER', {
      auditStatus: 'PENDING',
    });
  }

  async cancelOrder(orderSn: string, payload: ErpOrderCancelDto) {
    const shopeeResult = await this.orderSdk.cancelOrder(
      payload.shopId,
      orderSn,
      payload.cancelReason,
    );
    const projection = await this.upsertManualState(payload.shopId, orderSn, {
      orderStatus: 'CANCELLED',
      fulfillmentStage: 'pending_shipment',
    });

    await this.recordOrderLog({
      shopId: payload.shopId,
      orderSn,
      action: 'CANCEL_ORDER',
      status: 'SUCCESS',
      request: payload,
      response: { projectionId: projection.id, shopeeResult },
    });

    return this.success({ projection, shopeeResult });
  }

  async assignWarehouse(orderSn: string, payload: ErpOrderWarehouseDto) {
    return this.updateLocalAction(orderSn, payload, 'ASSIGN_WAREHOUSE', {
      warehouseName: payload.warehouseName,
      raw: this.appendManualStatePatch(
        await this.findRaw(payload.shopId, orderSn),
        'warehouse_assignment',
        {
          warehouseName: payload.warehouseName,
          allocationReason: payload.allocationReason,
        },
      ),
    });
  }

  async selectLogistics(orderSn: string, payload: ErpOrderLogisticsDto) {
    return this.updateLocalAction(orderSn, payload, 'SELECT_LOGISTICS', {
      logisticsChannel: payload.logisticsChannel,
      shippingCarrier: payload.shippingCarrier ?? payload.logisticsChannel,
    });
  }

  async updateTags(orderSn: string, payload: ErpOrderTagsDto) {
    return this.updateLocalAction(orderSn, payload, 'UPDATE_TAGS', {
      tags: this.toJson(payload.tags),
    });
  }

  async createAfterSale(orderSn: string, payload: ErpOrderAfterSaleDto) {
    return this.updateLocalAction(orderSn, payload, 'CREATE_AFTER_SALE', {
      afterSaleStatus: payload.afterSaleStatus,
      raw: this.appendManualStatePatch(
        await this.findRaw(payload.shopId, orderSn),
        'after_sale',
        {
          afterSaleStatus: payload.afterSaleStatus,
          reason: payload.reason,
        },
      ),
    });
  }

  async splitOrder(orderSn: string, payload: ErpOrderSplitDto) {
    const splitGroupId = payload.splitGroupId || `split-${orderSn}-${Date.now()}`;
    const parent = await this.upsertManualState(payload.shopId, orderSn, {
      splitGroupId,
    });

    const children = await Promise.all(
      payload.childOrderSns.map((childOrderSn) =>
        this.upsertManualState(payload.shopId, childOrderSn, {
          parentOrderSn: orderSn,
          splitGroupId,
        }),
      ),
    );

    const response = {
      parentOrderSn: orderSn,
      splitGroupId,
      childOrderSns: payload.childOrderSns,
      parentId: parent.id,
      childIds: children.map((child) => child.id),
    };

    await this.recordOrderLog({
      shopId: payload.shopId,
      orderSn,
      action: 'SPLIT_ORDER',
      status: 'SUCCESS',
      request: payload,
      response,
    });

    return this.success(response);
  }

  async mergeOrders(payload: ErpOrderMergeDto) {
    const target = await this.upsertManualState(payload.shopId, payload.targetOrderSn, {});
    const sources = await Promise.all(
      payload.sourceOrderSns.map((sourceOrderSn) =>
        this.upsertManualState(payload.shopId, sourceOrderSn, {
          mergedIntoOrderSn: payload.targetOrderSn,
        }),
      ),
    );

    const response = {
      targetOrderSn: payload.targetOrderSn,
      sourceOrderSns: payload.sourceOrderSns,
      targetId: target.id,
      sourceIds: sources.map((source) => source.id),
    };

    await this.recordOrderLog({
      shopId: payload.shopId,
      orderSn: payload.targetOrderSn,
      action: 'MERGE_ORDERS',
      status: 'SUCCESS',
      request: payload,
      response,
    });

    return this.success(response);
  }

  private async setLockState(
    orderSn: string,
    payload: ErpOrderLockDto,
    locked: boolean,
    action: string,
  ) {
    return this.updateLocalAction(orderSn, payload, action, {
      locked,
      raw: this.appendManualStatePatch(
        await this.findRaw(payload.shopId, orderSn),
        locked ? 'lock' : 'unlock',
        { reason: payload.reason },
      ),
    });
  }

  private async updateLocalAction(
    orderSn: string,
    payload: ErpOrderShopActionDto,
    action: string,
    data: Prisma.ErpOrderProjectionUpdateInput,
  ) {
    const projection = await this.upsertManualState(payload.shopId, orderSn, data);

    await this.recordOrderLog({
      shopId: payload.shopId,
      orderSn,
      action,
      status: 'SUCCESS',
      request: payload,
      response: { projectionId: projection.id },
    });

    return this.success({ projection });
  }

  private async upsertManualState(
    shopId: string,
    orderSn: string,
    data: Prisma.ErpOrderProjectionUpdateInput,
  ) {
    return this.prismaService.erpOrderProjection.upsert({
      where: {
        shopId_orderSn: {
          shopId,
          orderSn,
        },
      },
      update: data,
      create: {
        shopId,
        orderSn,
        orderStatus: this.stringValue(data.orderStatus, 'UNKNOWN'),
        fulfillmentStage: this.stringValue(data.fulfillmentStage, 'pending_shipment'),
        remark: this.optionalStringValue(data.remark),
        locked: this.booleanValue(data.locked, false),
        auditStatus: this.stringValue(data.auditStatus, 'PENDING'),
        warehouseName: this.optionalStringValue(data.warehouseName),
        logisticsChannel: this.optionalStringValue(data.logisticsChannel),
        shippingCarrier: this.optionalStringValue(data.shippingCarrier),
        tags: this.optionalJsonValue(data.tags),
        afterSaleStatus: this.stringValue(data.afterSaleStatus, 'NONE'),
        parentOrderSn: this.optionalStringValue(data.parentOrderSn),
        mergedIntoOrderSn: this.optionalStringValue(data.mergedIntoOrderSn),
        splitGroupId: this.optionalStringValue(data.splitGroupId),
        raw: this.optionalJsonValue(data.raw),
      },
    });
  }

  private async findRaw(shopId: string, orderSn: string) {
    const projection = await this.prismaService.erpOrderProjection.findUnique({
      where: {
        shopId_orderSn: {
          shopId,
          orderSn,
        },
      },
      select: { raw: true },
    });
    return projection?.raw;
  }

  private appendManualStatePatch(
    raw: Prisma.JsonValue | null | undefined,
    key: string,
    value: Record<string, unknown>,
  ) {
    const record = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

    return this.toJson({
      ...record,
      manual_state: {
        ...(typeof record.manual_state === 'object' && record.manual_state !== null
          ? (record.manual_state as Record<string, unknown>)
          : {}),
        [key]: value,
      },
    });
  }

  private async recordOrderLog(input: {
    shopId?: string;
    orderSn?: string;
    action: string;
    status: string;
    message?: string;
    jobRecordId?: string;
    request?: unknown;
    response?: unknown;
    errorMessage?: string;
    operatorId?: string;
  }) {
    return this.prismaService.erpOrderOperationLog.create({
      data: {
        shopId: input.shopId,
        orderSn: input.orderSn,
        action: input.action,
        status: input.status,
        message: input.message,
        jobRecordId: input.jobRecordId,
        request: input.request ? this.toJson(input.request) : undefined,
        response: input.response ? this.toJson(input.response) : undefined,
        errorMessage: input.errorMessage,
        operatorId: input.operatorId,
      },
    });
  }

  private success<T>(data: T) {
    return {
      success: true,
      data,
    };
  }

  private stringValue(input: unknown, fallback: string) {
    return typeof input === 'string' && input ? input : fallback;
  }

  private optionalStringValue(input: unknown) {
    return typeof input === 'string' ? input : undefined;
  }

  private booleanValue(input: unknown, fallback: boolean) {
    return typeof input === 'boolean' ? input : fallback;
  }

  private optionalJsonValue(input: unknown): Prisma.InputJsonValue | undefined {
    return input === undefined ? undefined : this.toJson(input);
  }

  private toJson(input: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
  }
}
