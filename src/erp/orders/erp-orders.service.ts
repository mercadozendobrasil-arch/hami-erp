import { Injectable, NotFoundException } from '@nestjs/common';
import { ErpLabelStatus, JobStatus, Prisma } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';
import {
  OrderSdk,
  ShopeeShippingDocumentPackageInput,
} from 'src/shopee-sdk/modules/order.sdk';

import {
  ErpFulfillmentStage,
  ErpOrderQueryDto,
  ErpOrderStatusCountQueryDto,
} from './dto/erp-order-query.dto';
import {
  ErpBatchMarkReadyForPickupDto,
  ErpMarkReadyForPickupDto,
  ErpPrintLabelTaskDto,
} from './dto/erp-order-action.dto';

const STAGE_TO_SHOPEE_STATUS: Record<ErpFulfillmentStage, string> = {
  pending_invoice: 'READY_TO_SHIP',
  pending_shipment: 'READY_TO_SHIP',
  pending_print: 'READY_TO_SHIP',
  pending_pickup: 'PROCESSED',
  shipped: 'SHIPPED',
};

const DEFAULT_RESPONSE_FIELDS =
  'order_status,package_list,buyer_username,total_amount,currency,create_time,update_time,shipping_carrier,checkout_shipping_carrier';

@Injectable()
export class ErpOrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly orderSdk: OrderSdk,
  ) {}

  async getStatusCounts(query: ErpOrderStatusCountQueryDto) {
    if (query.shopId) {
      await this.refreshRecentOrderProjection(query.shopId);
    }

    const where: Prisma.ErpOrderProjectionWhereInput = query.shopId
      ? { shopId: query.shopId }
      : {};

    const grouped = await this.prismaService.erpOrderProjection.groupBy({
      by: ['fulfillmentStage'],
      where,
      _count: { _all: true },
    });

    const counts = {
      pendingInvoice: 0,
      pendingShipment: 0,
      pendingPrint: 0,
      pendingPickup: 0,
      shipped: 0,
      total: 0,
    };

    for (const item of grouped) {
      const count = item._count._all;
      counts.total += count;
      if (item.fulfillmentStage === 'pending_invoice') counts.pendingInvoice = count;
      if (item.fulfillmentStage === 'pending_shipment') counts.pendingShipment = count;
      if (item.fulfillmentStage === 'pending_print') counts.pendingPrint = count;
      if (item.fulfillmentStage === 'pending_pickup') counts.pendingPickup = count;
      if (item.fulfillmentStage === 'shipped') counts.shipped = count;
    }

    return {
      success: true,
      data: counts,
    };
  }

  async listOrders(query: ErpOrderQueryDto) {
    if (query.shopId) {
      await this.refreshRecentOrderProjection(query.shopId, query.fulfillmentStage);
    }

    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ErpOrderProjectionWhereInput = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.fulfillmentStage
        ? { fulfillmentStage: query.fulfillmentStage }
        : {}),
      ...(query.orderSn ? { orderSn: { contains: query.orderSn } } : {}),
    };

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.erpOrderProjection.count({ where }),
      this.prismaService.erpOrderProjection.findMany({
        where,
        orderBy: [{ updateTime: 'desc' }, { updatedAt: 'desc' }],
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: data.map((item) => this.toListItem(item)),
      total,
      current,
      pageSize,
    };
  }

  async createPrintTask(payload: ErpPrintLabelTaskDto) {
    const jobRecord = await this.prismaService.jobRecord.create({
      data: {
        queueName: 'erp-orders',
        jobName: 'create-shipping-document',
        status: JobStatus.PROCESSING,
        payload: this.toJson(payload),
      },
    });

    const labels = await Promise.all(
      payload.orders.map((order) =>
        this.prismaService.erpShippingLabelRecord.create({
          data: {
            shopId: payload.shopId,
            orderSn: order.orderSn,
            packageNumber: order.packageNumber,
            shippingDocumentType: order.shippingDocumentType,
            status: ErpLabelStatus.PROCESSING,
            jobRecordId: jobRecord.id,
          },
        }),
      ),
    );

    try {
      const result = await this.orderSdk.createShippingDocument(
        payload.shopId,
        payload.orders,
      );

      await this.prismaService.$transaction([
        this.prismaService.jobRecord.update({
          where: { id: jobRecord.id },
          data: {
            status: JobStatus.COMPLETED,
            result: this.toJson(result),
            processedAt: new Date(),
          },
        }),
        this.prismaService.erpShippingLabelRecord.updateMany({
          where: { jobRecordId: jobRecord.id },
          data: { status: ErpLabelStatus.READY, result: this.toJson(result) },
        }),
      ]);

      return {
        success: true,
        data: {
          jobId: jobRecord.id,
          labelIds: labels.map((label) => label.id),
          result,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Create shipping document failed.';
      await this.prismaService.$transaction([
        this.prismaService.jobRecord.update({
          where: { id: jobRecord.id },
          data: {
            status: JobStatus.FAILED,
            errorMessage: message,
            processedAt: new Date(),
          },
        }),
        this.prismaService.erpShippingLabelRecord.updateMany({
          where: { jobRecordId: jobRecord.id },
          data: { status: ErpLabelStatus.FAILED, errorMessage: message },
        }),
      ]);
      throw error;
    }
  }

  async downloadLabel(labelId: string) {
    const label = await this.prismaService.erpShippingLabelRecord.findUnique({
      where: { id: labelId },
    });

    if (!label) {
      throw new NotFoundException('Shipping label record not found.');
    }

    const file = await this.orderSdk.downloadShippingDocument(label.shopId, [
      {
        orderSn: label.orderSn,
        packageNumber: label.packageNumber ?? undefined,
        shippingDocumentType: label.shippingDocumentType ?? undefined,
      },
    ]);

    await this.prismaService.erpShippingLabelRecord.update({
      where: { id: label.id },
      data: {
        status: ErpLabelStatus.DOWNLOADED,
        downloadedAt: new Date(),
      },
    });

    return {
      file,
      filename: `${label.orderSn}-${label.packageNumber ?? 'label'}.pdf`,
    };
  }

  async markReadyForPickup(orderSn: string, payload: ErpMarkReadyForPickupDto) {
    const result = await this.orderSdk.shipOrder(payload.shopId, {
      orderSn,
      packageNumber: payload.packageNumber,
      pickup: payload.pickup,
      dropoff: payload.dropoff,
      nonIntegrated: payload.nonIntegrated,
    });

    await this.upsertProjectionFromOrder(payload.shopId, {
      order_sn: orderSn,
      order_status: 'PROCESSED',
      package_list: [
        {
          package_number: payload.packageNumber,
          package_status: 'PROCESSED',
        },
      ],
    });

    return {
      success: true,
      data: result,
    };
  }

  async batchMarkReadyForPickup(payload: ErpBatchMarkReadyForPickupDto) {
    const successList: Array<{ orderSn: string; result: unknown }> = [];
    const failList: Array<{ orderSn: string; errorMessage: string }> = [];

    for (const order of payload.orders) {
      try {
        const result = await this.markReadyForPickup(order.orderSn, {
          ...order,
          shopId: payload.shopId,
        });
        successList.push({ orderSn: order.orderSn, result: result.data });
      } catch (error) {
        failList.push({
          orderSn: order.orderSn,
          errorMessage: error instanceof Error ? error.message : 'Unknown ship_order error.',
        });
      }
    }

    return {
      success: failList.length === 0,
      data: {
        successList,
        failList,
      },
    };
  }

  private async refreshRecentOrderProjection(
    shopId: string,
    fulfillmentStage?: ErpFulfillmentStage,
  ) {
    const now = Math.floor(Date.now() / 1000);
    const orderStatus = fulfillmentStage
      ? STAGE_TO_SHOPEE_STATUS[fulfillmentStage]
      : undefined;
    const response = await this.orderSdk.getOrderList(shopId, {
      timeRangeField: 'update_time',
      timeFrom: now - 15 * 24 * 60 * 60,
      timeTo: now,
      pageSize: 50,
      orderStatus,
      responseOptionalFields: DEFAULT_RESPONSE_FIELDS,
    });

    const orders = this.extractOrderList(response.response);
    await Promise.all(
      orders.map((order) => this.upsertProjectionFromOrder(shopId, order)),
    );
  }

  private extractOrderList(response: unknown): Record<string, unknown>[] {
    if (!response || typeof response !== 'object') return [];
    const record = response as Record<string, unknown>;
    const list = record.order_list;
    return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
  }

  private async upsertProjectionFromOrder(
    shopId: string,
    order: Record<string, unknown>,
  ) {
    const orderSn = String(order.order_sn ?? order.orderSn ?? '');
    if (!orderSn) return;

    const orderStatus = String(order.order_status ?? order.orderStatus ?? 'UNKNOWN');
    const firstPackage = this.firstObject(order.package_list);
    const stage = this.resolveFulfillmentStage(orderStatus, firstPackage);

    await this.prismaService.erpOrderProjection.upsert({
      where: {
        shopId_orderSn: {
          shopId,
          orderSn,
        },
      },
      update: {
        orderStatus,
        fulfillmentStage: stage,
        packageNumber: this.optionalString(firstPackage?.package_number),
        packageStatus: this.optionalString(firstPackage?.package_status),
        logisticsStatus: this.optionalString(firstPackage?.logistics_status),
        shippingCarrier: this.optionalString(order.shipping_carrier ?? order.checkout_shipping_carrier),
        shippingDocumentStatus: this.optionalString(firstPackage?.shipping_document_status),
        shippingDocumentType: this.optionalString(firstPackage?.shipping_document_type),
        buyerUsername: this.optionalString(order.buyer_username),
        totalAmount: this.optionalDecimal(order.total_amount),
        currency: this.optionalString(order.currency),
        createTime: this.optionalDateFromSeconds(order.create_time),
        updateTime: this.optionalDateFromSeconds(order.update_time),
        raw: this.toJson(order),
        lastSyncedAt: new Date(),
      },
      create: {
        shopId,
        orderSn,
        orderStatus,
        fulfillmentStage: stage,
        packageNumber: this.optionalString(firstPackage?.package_number),
        packageStatus: this.optionalString(firstPackage?.package_status),
        logisticsStatus: this.optionalString(firstPackage?.logistics_status),
        shippingCarrier: this.optionalString(order.shipping_carrier ?? order.checkout_shipping_carrier),
        shippingDocumentStatus: this.optionalString(firstPackage?.shipping_document_status),
        shippingDocumentType: this.optionalString(firstPackage?.shipping_document_type),
        buyerUsername: this.optionalString(order.buyer_username),
        totalAmount: this.optionalDecimal(order.total_amount),
        currency: this.optionalString(order.currency),
        createTime: this.optionalDateFromSeconds(order.create_time),
        updateTime: this.optionalDateFromSeconds(order.update_time),
        raw: this.toJson(order),
      },
    });
  }

  private resolveFulfillmentStage(
    orderStatus: string,
    firstPackage?: Record<string, unknown>,
  ): ErpFulfillmentStage {
    if (orderStatus === 'SHIPPED') return 'shipped';
    if (orderStatus === 'PROCESSED') return 'pending_pickup';
    if (orderStatus !== 'READY_TO_SHIP') return 'pending_shipment';

    const documentStatus = String(firstPackage?.shipping_document_status ?? '');
    if (!documentStatus || documentStatus === 'NOT_CREATED') return 'pending_print';
    if (documentStatus === 'READY' || documentStatus === 'CREATED') return 'pending_pickup';
    return 'pending_shipment';
  }

  private firstObject(input: unknown): Record<string, unknown> | undefined {
    if (!Array.isArray(input) || input.length === 0) return undefined;
    const first = input[0];
    return first && typeof first === 'object'
      ? (first as Record<string, unknown>)
      : undefined;
  }

  private toListItem(item: {
    id: string;
    shopId: string;
    orderSn: string;
    orderStatus: string;
    fulfillmentStage: string;
    packageNumber: string | null;
    packageStatus: string | null;
    logisticsStatus: string | null;
    shippingCarrier: string | null;
    shippingDocumentStatus: string | null;
    shippingDocumentType: string | null;
    buyerUsername: string | null;
    totalAmount: Prisma.Decimal | null;
    currency: string | null;
    createTime: Date | null;
    updateTime: Date | null;
    lastSyncedAt: Date;
  }) {
    return {
      id: item.id,
      orderNo: item.orderSn,
      platformOrderNo: item.orderSn,
      orderSn: item.orderSn,
      platform: 'Shopee',
      platformChannel: 'SHOPEE',
      platformRegion: 'BR',
      platformShopId: item.shopId,
      platformStatus: item.orderStatus,
      fulfillmentStage: item.fulfillmentStage,
      shopName: item.shopId,
      buyerName: item.buyerUsername ?? '-',
      buyerUserId: '-',
      items: '-',
      skuCount: 0,
      totalAmount: item.totalAmount?.toString() ?? '0.00',
      currency: item.currency ?? 'BRL',
      createTime: item.createTime?.toISOString() ?? '',
      updateTime: item.updateTime?.toISOString() ?? '',
      packageNumber: item.packageNumber ?? undefined,
      packageStatus: item.packageStatus ?? undefined,
      logisticsStatus: item.logisticsStatus ?? undefined,
      shippingCarrier: item.shippingCarrier ?? undefined,
      shippingDocumentStatus: item.shippingDocumentStatus ?? undefined,
      shippingDocumentType: item.shippingDocumentType ?? undefined,
      lastSyncTime: item.lastSyncedAt.toISOString(),
      orderStatus: item.orderStatus,
    };
  }

  private optionalString(input: unknown): string | undefined {
    if (input === undefined || input === null || input === '') return undefined;
    return String(input);
  }

  private optionalDecimal(input: unknown): Prisma.Decimal | undefined {
    if (input === undefined || input === null || input === '') return undefined;
    return new Prisma.Decimal(String(input));
  }

  private optionalDateFromSeconds(input: unknown): Date | undefined {
    if (input === undefined || input === null || input === '') return undefined;
    const value = Number(input);
    if (!Number.isFinite(value) || value <= 0) return undefined;
    return new Date(value * 1000);
  }

  private toJson(input: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
  }
}
