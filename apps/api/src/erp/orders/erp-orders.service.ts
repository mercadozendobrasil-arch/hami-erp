import { Injectable, NotFoundException } from '@nestjs/common';
import { ErpLabelStatus, JobStatus, Prisma } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';
import { OrderSdk } from 'src/shopee-sdk/modules/order.sdk';

import {
  ErpFulfillmentStage,
  ErpOrderLogQueryDto,
  ErpOrderQueryDto,
  ErpOrderStatusCountQueryDto,
} from './dto/erp-order-query.dto';
import {
  ErpBatchMarkReadyForPickupDto,
  ErpBatchMarkShippedDto,
  ErpMarkReadyForPickupDto,
  ErpOrderShopActionDto,
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

  async getOrderDetail(orderSn: string, shopId?: string) {
    let projection = await this.findProjection(orderSn, shopId);

    if (!projection && shopId) {
      const detail = await this.pullOrderDetail(shopId, orderSn);
      projection = await this.upsertProjectionFromOrder(shopId, detail);
    }

    if (!projection) {
      throw new NotFoundException('ERP order projection not found. Provide shopId to pull from Shopee.');
    }

    return {
      success: true,
      data: this.toDetailItem(projection),
    };
  }

  async syncOrderDetail(orderSn: string, payload: ErpOrderShopActionDto) {
    const jobRecord = await this.createProcessingJob('sync-order-detail', {
      shopId: payload.shopId,
      orderSn,
    });

    try {
      const detail = await this.pullOrderDetail(payload.shopId, orderSn);
      const projection = await this.upsertProjectionFromOrder(payload.shopId, detail);
      const result = {
        totalNum: 1,
        processedNum: 1,
        successList: [{ orderSn, recordId: projection.id }],
        failList: [],
        recordId: projection.id,
        status: projection.orderStatus,
      };

      await this.completeJob(jobRecord.id, result);
      await this.recordOrderLog({
        shopId: payload.shopId,
        orderSn,
        action: 'SYNC_ORDER_DETAIL',
        status: 'SUCCESS',
        jobRecordId: jobRecord.id,
        request: payload,
        response: result,
      });

      return {
        success: true,
        data: {
          jobId: jobRecord.id,
          ...result,
        },
      };
    } catch (error) {
      const message = this.errorMessage(error, 'Sync order detail failed.');
      await this.failJob(jobRecord.id, message);
      await this.recordOrderLog({
        shopId: payload.shopId,
        orderSn,
        action: 'SYNC_ORDER_DETAIL',
        status: 'FAILED',
        jobRecordId: jobRecord.id,
        request: payload,
        errorMessage: message,
      });
      throw error;
    }
  }

  async getEscrow(orderSn: string, payload: ErpOrderShopActionDto) {
    const result = await this.orderSdk.getEscrowDetail(payload.shopId, orderSn);
    await this.recordOrderLog({
      shopId: payload.shopId,
      orderSn,
      action: 'GET_ESCROW_DETAIL',
      status: 'SUCCESS',
      request: payload,
      response: result,
    });

    return {
      success: true,
      data: result,
    };
  }

  async listLogs(query: ErpOrderLogQueryDto) {
    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ErpOrderOperationLogWhereInput = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.orderSn ? { orderSn: query.orderSn } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.erpOrderOperationLog.count({ where }),
      this.prismaService.erpOrderOperationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data,
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
      const normalizedResult = {
        totalNum: payload.orders.length,
        processedNum: payload.orders.length,
        successList: payload.orders.map((order) => ({ orderSn: order.orderSn })),
        failList: [],
        raw: result,
      };

      await this.prismaService.$transaction([
        this.prismaService.jobRecord.update({
          where: { id: jobRecord.id },
          data: {
            status: JobStatus.COMPLETED,
            result: this.toJson(normalizedResult),
            processedAt: new Date(),
          },
        }),
        this.prismaService.erpShippingLabelRecord.updateMany({
          where: { jobRecordId: jobRecord.id },
          data: { status: ErpLabelStatus.READY, result: this.toJson(result) },
        }),
      ]);

      await Promise.all(
        payload.orders.map((order) =>
          this.recordOrderLog({
            shopId: payload.shopId,
            orderSn: order.orderSn,
            action: 'CREATE_SHIPPING_DOCUMENT',
            status: 'SUCCESS',
            jobRecordId: jobRecord.id,
            request: payload,
            response: result,
          }),
        ),
      );

      return {
        success: true,
        data: {
          jobId: jobRecord.id,
          labelIds: labels.map((label) => label.id),
          result,
        },
      };
    } catch (error) {
      const message = this.errorMessage(error, 'Create shipping document failed.');
      await this.prismaService.$transaction([
        this.prismaService.jobRecord.update({
          where: { id: jobRecord.id },
          data: {
            status: JobStatus.FAILED,
            errorMessage: message,
            result: this.toJson({
              totalNum: payload.orders.length,
              processedNum: 0,
              successList: [],
              failList: payload.orders.map((order) => ({ orderSn: order.orderSn, errorMessage: message })),
            }),
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

    await this.recordOrderLog({
      shopId: label.shopId,
      orderSn: label.orderSn,
      action: 'DOWNLOAD_SHIPPING_DOCUMENT',
      status: 'SUCCESS',
      jobRecordId: label.jobRecordId ?? undefined,
      response: { labelId },
    });

    return {
      file,
      filename: `${label.orderSn}-${label.packageNumber ?? 'label'}.pdf`,
    };
  }

  async arrangeShipment(orderSn: string, payload: ErpMarkReadyForPickupDto) {
    const jobRecord = await this.createProcessingJob('arrange-shipment', {
      shopId: payload.shopId,
      orderSn,
      packageNumber: payload.packageNumber,
    });

    try {
      const result = await this.shipOrderDirect(orderSn, payload);
      const normalizedResult = {
        totalNum: 1,
        processedNum: 1,
        successList: [{ orderSn, result }],
        failList: [],
      };
      await this.completeJob(jobRecord.id, normalizedResult);
      await this.recordOrderLog({
        shopId: payload.shopId,
        orderSn,
        action: 'ARRANGE_SHIPMENT',
        status: 'SUCCESS',
        jobRecordId: jobRecord.id,
        request: payload,
        response: result,
      });

      return {
        success: true,
        data: {
          jobId: jobRecord.id,
          result,
        },
      };
    } catch (error) {
      const message = this.errorMessage(error, 'Arrange shipment failed.');
      await this.failJob(jobRecord.id, message, {
        totalNum: 1,
        processedNum: 0,
        successList: [],
        failList: [{ orderSn, errorMessage: message }],
      });
      await this.recordOrderLog({
        shopId: payload.shopId,
        orderSn,
        action: 'ARRANGE_SHIPMENT',
        status: 'FAILED',
        jobRecordId: jobRecord.id,
        request: payload,
        errorMessage: message,
      });
      throw error;
    }
  }

  async markReadyForPickup(orderSn: string, payload: ErpMarkReadyForPickupDto) {
    const result = await this.shipOrderDirect(orderSn, payload);
    await this.recordOrderLog({
      shopId: payload.shopId,
      orderSn,
      action: 'MARK_READY_FOR_PICKUP',
      status: 'SUCCESS',
      request: payload,
      response: result,
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
          errorMessage: this.errorMessage(error, 'Unknown ship_order error.'),
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

  async batchArrangeShipment(payload: ErpBatchMarkReadyForPickupDto) {
    const jobRecord = await this.createProcessingJob('batch-arrange-shipment', payload);
    const successList: Array<{ orderSn: string; result: unknown }> = [];
    const failList: Array<{ orderSn: string; errorMessage: string }> = [];

    for (const order of payload.orders) {
      try {
        const result = await this.shipOrderDirect(order.orderSn, {
          ...order,
          shopId: payload.shopId,
        });
        successList.push({ orderSn: order.orderSn, result });
      } catch (error) {
        failList.push({
          orderSn: order.orderSn,
          errorMessage: this.errorMessage(error, 'Arrange shipment failed.'),
        });
      }
    }

    const result = {
      totalNum: payload.orders.length,
      processedNum: successList.length + failList.length,
      successList,
      failList,
    };

    if (failList.length) {
      await this.failJob(jobRecord.id, 'Some orders failed to arrange shipment.', result);
    } else {
      await this.completeJob(jobRecord.id, result);
    }

    return {
      success: failList.length === 0,
      data: {
        jobId: jobRecord.id,
        ...result,
      },
    };
  }

  async batchMarkShipped(payload: ErpBatchMarkShippedDto) {
    const jobRecord = await this.createProcessingJob('batch-mark-shipped', payload);
    const successList: Array<{ orderSn: string; recordId: string }> = [];
    const failList: Array<{ orderSn: string; errorMessage: string }> = [];

    for (const orderSn of payload.orderSns) {
      try {
        const projection = await this.upsertProjectionFromOrder(payload.shopId, {
          order_sn: orderSn,
          order_status: 'SHIPPED',
          update_time: Math.floor(Date.now() / 1000),
        });
        successList.push({ orderSn, recordId: projection.id });
        await this.recordOrderLog({
          shopId: payload.shopId,
          orderSn,
          action: 'BATCH_MARK_SHIPPED',
          status: 'SUCCESS',
          jobRecordId: jobRecord.id,
          request: payload,
          response: { recordId: projection.id },
        });
      } catch (error) {
        const message = this.errorMessage(error, 'Mark shipped failed.');
        failList.push({ orderSn, errorMessage: message });
      }
    }

    const result = {
      totalNum: payload.orderSns.length,
      processedNum: successList.length + failList.length,
      successList,
      failList,
    };

    if (failList.length) {
      await this.failJob(jobRecord.id, 'Some orders failed to mark shipped.', result);
    } else {
      await this.completeJob(jobRecord.id, result);
    }

    return {
      success: failList.length === 0,
      data: {
        jobId: jobRecord.id,
        ...result,
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

  private async pullOrderDetail(shopId: string, orderSn: string) {
    const response = await this.orderSdk.getOrderDetail(shopId, orderSn);
    const order = this.extractFirstOrder(response.response);
    if (!order) {
      throw new NotFoundException('Shopee order detail not found.');
    }
    return order;
  }

  private extractOrderList(response: unknown): Record<string, unknown>[] {
    if (!response || typeof response !== 'object') return [];
    const record = response as Record<string, unknown>;
    const list = record.order_list;
    return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
  }

  private extractFirstOrder(response: unknown): Record<string, unknown> | undefined {
    return this.extractOrderList(response)[0];
  }

  private async findProjection(orderSn: string, shopId?: string) {
    return this.prismaService.erpOrderProjection.findFirst({
      where: {
        orderSn,
        ...(shopId ? { shopId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async upsertProjectionFromOrder(
    shopId: string,
    order: Record<string, unknown>,
  ) {
    const orderSn = String(order.order_sn ?? order.orderSn ?? '');
    if (!orderSn) {
      throw new Error('Cannot upsert order projection without order_sn.');
    }

    const orderStatus = String(order.order_status ?? order.orderStatus ?? 'UNKNOWN');
    const firstPackage = this.firstObject(order.package_list);
    const stage = this.resolveFulfillmentStage(orderStatus, firstPackage);

    return this.prismaService.erpOrderProjection.upsert({
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

  private async shipOrderDirect(orderSn: string, payload: ErpMarkReadyForPickupDto) {
    const result = await this.orderSdk.shipOrder(payload.shopId, {
      orderSn,
      packageNumber: payload.packageNumber,
      pickup: payload.pickup ? this.asRecord(payload.pickup) : undefined,
      dropoff: payload.dropoff ? this.asRecord(payload.dropoff) : undefined,
      nonIntegrated: payload.nonIntegrated ? this.asRecord(payload.nonIntegrated) : undefined,
    });

    await this.upsertProjectionFromOrder(payload.shopId, {
      order_sn: orderSn,
      order_status: 'PROCESSED',
      update_time: Math.floor(Date.now() / 1000),
      package_list: [
        {
          package_number: payload.packageNumber,
          package_status: 'PROCESSED',
        },
      ],
    });

    return result;
  }

  private async createProcessingJob(jobName: string, payload: unknown) {
    return this.prismaService.jobRecord.create({
      data: {
        queueName: 'erp-orders',
        jobName,
        status: JobStatus.PROCESSING,
        payload: this.toJson(payload),
      },
    });
  }

  private async completeJob(jobId: string, result: unknown) {
    return this.prismaService.jobRecord.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        result: this.toJson(result),
        processedAt: new Date(),
      },
    });
  }

  private async failJob(jobId: string, errorMessage: string, result?: unknown) {
    return this.prismaService.jobRecord.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        errorMessage,
        ...(result ? { result: this.toJson(result) } : {}),
        processedAt: new Date(),
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

  private toDetailItem(item: Parameters<typeof this.toListItem>[0] & { raw?: Prisma.JsonValue | null }) {
    const raw = this.asRecord(item.raw);
    const detail = this.toListItem(item);
    return {
      ...detail,
      raw,
      buyerUserId: this.optionalString(raw.buyer_user_id) ?? detail.buyerUserId,
      buyerName: this.optionalString(raw.buyer_username) ?? detail.buyerName,
      messageToSeller: this.optionalString(raw.message_to_seller) ?? detail.messageToSeller,
      paymentMethod: this.optionalString(raw.payment_method) ?? detail.paymentMethod,
      recipientAddress: raw.recipient_address,
      itemList: Array.isArray(raw.item_list) ? raw.item_list : [],
      invoiceData: raw.invoice_data,
      paymentInfo: raw.payment_info,
      packageList: Array.isArray(raw.package_list) ? raw.package_list : detail.packageList,
    };
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
    const packageInfo = item.packageNumber
      ? [
          {
            orderSn: item.orderSn,
            packageNumber: item.packageNumber,
            packageStatus: item.packageStatus ?? 'PENDING',
            packageFulfillmentStatus: item.orderStatus,
            fulfillmentStatus: item.orderStatus,
            logisticsStatus: item.logisticsStatus ?? 'LOGISTICS_NOT_START',
            shippingCarrier: item.shippingCarrier ?? '-',
            logisticsChannelId: 0,
            shippingDocumentStatus: item.shippingDocumentStatus ?? undefined,
            shippingDocumentType: item.shippingDocumentType ?? undefined,
            allowSelfDesignAwb: false,
            infoNeeded: [],
            parcelItemCount: 0,
            itemCount: 0,
            latestPackageUpdateTime: item.updateTime?.toISOString() ?? item.lastSyncedAt.toISOString(),
            dataSource: 'REALTIME_SYNCED',
            realFieldList: [],
            shipByDate: item.updateTime?.toISOString() ?? item.lastSyncedAt.toISOString(),
            updateTime: item.updateTime?.toISOString() ?? item.lastSyncedAt.toISOString(),
            itemList: [],
          },
        ]
      : [];

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
      fulfillmentStageDescription: item.fulfillmentStage,
      nextActionSuggestion: '-',
      statusTrail: [item.orderStatus],
      shopName: item.shopId,
      buyerName: item.buyerUsername ?? '-',
      buyerUserId: '-',
      messageToSeller: '-',
      items: '-',
      skuCount: 0,
      totalAmount: item.totalAmount?.toString() ?? '0.00',
      currency: item.currency ?? 'BRL',
      createTime: item.createTime?.toISOString() ?? '',
      updateTime: item.updateTime?.toISOString() ?? '',
      shipByDate: item.updateTime?.toISOString() ?? '',
      daysToShip: 0,
      estimatedShippingFee: '0.00',
      actualShippingFee: '0.00',
      paymentMethod: '-',
      shippingCarrier: item.shippingCarrier ?? '-',
      checkoutShippingCarrier: item.shippingCarrier ?? '-',
      reverseShippingFee: '0.00',
      orderChargeableWeightGram: 0,
      pendingTerms: [],
      fulfillmentFlag: '-',
      packageNumber: item.packageNumber ?? undefined,
      packageCount: packageInfo.length,
      packageStatus: item.packageStatus ?? 'PENDING',
      packageFulfillmentStatus: item.orderStatus,
      packageList: packageInfo,
      lastSyncTime: item.lastSyncedAt.toISOString(),
      syncMeta: {
        lastSyncTime: item.lastSyncedAt.toISOString(),
        detailSource: 'REALTIME_SYNCED',
        packageSource: 'REALTIME_SYNCED',
        paymentSource: 'FALLBACK',
        invoiceSource: 'FALLBACK',
        addressSource: 'FALLBACK',
        statusSource: 'REALTIME_SYNCED',
        fallbackFields: ['payment_info', 'invoice_data', 'recipient_address'],
      },
      infoNeeded: [],
      orderStatus: item.orderStatus,
      payStatus: 'PAID',
      auditStatus: 'APPROVED',
      deliveryStatus: item.orderStatus,
      afterSaleStatus: 'NONE',
      warehouseName: '-',
      logisticsCompany: item.shippingCarrier ?? '-',
      trackingNo: '-',
      tags: [],
      exceptionTags: [],
      hitRuleCodes: [],
      hitRuleNames: [],
      exceptionReason: '',
      riskLevel: 'LOW',
      suggestedAction: '-',
      currentStatus: 'PENDING_REVIEW',
      orderTime: item.createTime?.toISOString() ?? '',
      remark: '',
      locked: false,
      logisticsStatus: item.logisticsStatus ?? 'LOGISTICS_NOT_START',
      logisticsChannel: item.shippingCarrier ?? '-',
      dispatchRecommendation: '-',
      deliveryAging: 0,
      freightEstimate: '0.00',
      warehouseStatus: 'PENDING',
      allocationStrategy: '-',
      allocationReason: '-',
      stockWarning: '',
      stockSufficient: true,
      recommendedWarehouse: '-',
      processingProfile: {
        platform: 'SHOPEE',
        region: 'BR',
        shopId: item.shopId,
        platformStatus: item.orderStatus,
        orderManager: 'ERP',
        logisticsManager: 'ERP',
        returnsManager: 'ERP',
        primaryReadEndpoint: '/api/erp/orders',
        detailEndpoint: `/api/erp/orders/${item.orderSn}`,
        shipmentEndpoint: `/api/erp/orders/${item.orderSn}/mark-ready-for-pickup`,
        logisticsEndpoint: '/api/erp/orders/labels/print-task',
        returnsEndpoint: '-',
        actionBindings: [],
      },
      shippingDocumentStatus: item.shippingDocumentStatus ?? undefined,
      shippingDocumentType: item.shippingDocumentType ?? undefined,
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

  private asRecord(input: unknown): Record<string, unknown> {
    return input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  }

  private errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }

  private toJson(input: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
  }
}
