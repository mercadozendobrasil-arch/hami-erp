import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type OrderQuery = {
  current?: number;
  pageSize?: number;
  shopId?: string;
  orderNo?: string;
  packageNumber?: string;
  orderStatus?: string;
  currentTab?: string;
};

type LogisticsQuery = {
  current?: number;
  pageSize?: number;
  shopId?: string;
  orderNo?: string;
  packageNumber?: string;
  logisticsChannel?: string;
  logisticsStatus?: string;
  shippingDocumentStatus?: string;
};

type PackagePrecheckQuery = {
  current?: number;
  pageSize?: number;
  shopId?: string;
  orderNo?: string;
  orderSn?: string;
  packageNumber?: string;
  logisticsProfile?: string;
  logisticsChannelId?: string;
  logisticsChannelName?: string;
  shippingCarrier?: string;
  packageStatus?: string;
  logisticsStatus?: string;
  shippingDocumentStatus?: string;
  canShip?: string;
  startTime?: string;
  endTime?: string;
  timeField?: string;
};

type OrderOperationPayload = {
  orderId?: string;
  orderIds?: string[];
  orderNo?: string;
  orderNos?: string[];
  orderSn?: string;
  shopId?: string;
};

type OrderRow = Prisma.ErpOrderGetPayload<{
  include: {
    shop: true;
    packages: true;
  };
}>;

type LogisticsPackageRow = Prisma.ErpOrderPackageGetPayload<{
  include: {
    order: {
      include: {
        shop: true;
      };
    };
  };
}>;

type SyncLogRow = Prisma.ShopeeOrderSyncLogGetPayload<{}>;

type JsonRecord = Record<string, unknown>;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: OrderQuery) {
    const current = Number(query.current) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (current - 1) * pageSize;
    const where = this.buildOrderWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.erpOrder.findMany({
        where,
        include: {
          shop: true,
          packages: true,
        },
        orderBy: [{ createdAtRemote: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.erpOrder.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.serializeOrder(row)),
      total,
      success: true,
      current,
      pageSize,
    };
  }

  async getOverview(query: Pick<OrderQuery, 'shopId' | 'currentTab'>) {
    const where = this.buildOrderWhere(query);
    const rows = await this.prisma.erpOrder.findMany({
      where,
      select: {
        orderStatus: true,
        rawJson: true,
      },
    });

    return {
      success: true,
      data: {
        total: rows.length,
        pendingCount: rows.filter((row) => this.isPendingStatus(row.orderStatus)).length,
        pendingInvoiceCount: rows.filter((row) => row.orderStatus === 'PENDING_INVOICE').length,
        abnormalCount: rows.filter((row) =>
          ['IN_CANCEL', 'RETRY_SHIP', 'TO_RETURN'].includes(row.orderStatus),
        ).length,
        shippedCount: rows.filter((row) =>
          ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'].includes(row.orderStatus),
        ).length,
        cancelRefundCount: rows.filter((row) =>
          ['IN_CANCEL', 'CANCELLED', 'TO_RETURN'].includes(row.orderStatus),
        ).length,
        lockedCount: rows.filter((row) => {
          const raw =
            row.rawJson && typeof row.rawJson === 'object' && !Array.isArray(row.rawJson)
              ? (row.rawJson as JsonRecord)
              : {};
          return Boolean(this.pickValue(raw, ['locked']));
        }).length,
        printPendingCount: 0,
        logisticsPendingCount: 0,
        warehousePendingCount: 0,
        unpaidCount: rows.filter((row) => row.orderStatus === 'UNPAID').length,
        readyToShipCount: rows.filter((row) => row.orderStatus === 'READY_TO_SHIP').length,
        processedCount: rows.filter((row) => row.orderStatus === 'PROCESSED').length,
        toConfirmReceiveCount: rows.filter((row) => row.orderStatus === 'TO_CONFIRM_RECEIVE').length,
        inCancelCount: rows.filter((row) => row.orderStatus === 'IN_CANCEL').length,
        retryShipCount: rows.filter((row) => row.orderStatus === 'RETRY_SHIP').length,
        toReturnCount: rows.filter((row) => row.orderStatus === 'TO_RETURN').length,
        cancelledCount: rows.filter((row) => row.orderStatus === 'CANCELLED').length,
        completedCount: rows.filter((row) => row.orderStatus === 'COMPLETED').length,
      },
    };
  }

  async findLogisticsMany(query: LogisticsQuery) {
    const current = Number(query.current) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (current - 1) * pageSize;

    const logisticsChannelFilter = query.logisticsChannel?.trim();
    const logisticsChannelId = logisticsChannelFilter
      ? Number(logisticsChannelFilter)
      : undefined;

    const where: Prisma.ErpOrderPackageWhereInput = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.packageNumber
        ? {
            packageNumber: {
              contains: query.packageNumber,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.orderNo
        ? {
            OR: [
              {
                orderNo: {
                  contains: query.orderNo,
                  mode: 'insensitive',
                },
              },
              {
                orderSn: {
                  contains: query.orderNo,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(logisticsChannelFilter
        ? {
            OR: [
              {
                logisticsChannelName: {
                  contains: logisticsChannelFilter,
                  mode: 'insensitive',
                },
              },
              ...(Number.isFinite(logisticsChannelId)
                ? [{ logisticsChannelId }]
                : []),
            ],
          }
        : {}),
      ...(query.logisticsStatus ? { logisticsStatus: query.logisticsStatus } : {}),
      ...(query.shippingDocumentStatus
        ? { shippingDocumentStatus: query.shippingDocumentStatus }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.erpOrderPackage.findMany({
        where,
        include: {
          order: {
            include: {
              shop: true,
            },
          },
        },
        orderBy: [{ latestPackageUpdateTime: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.erpOrderPackage.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.serializeLogisticsPackageRow(row)),
      total,
      success: true,
      current,
      pageSize,
    };
  }

  async findPackagePrecheckMany(query: PackagePrecheckQuery) {
    const current = Number(query.current) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where = this.buildPackagePrecheckWhere(query);

    const rows = await this.prisma.erpOrderPackage.findMany({
      where,
      include: {
        order: {
          include: {
            shop: true,
          },
        },
      },
      orderBy: [{ latestPackageUpdateTime: 'desc' }, { updatedAt: 'desc' }],
    });

    const packageNumbers = rows.map((row) => row.packageNumber);
    const latestLogs = packageNumbers.length
      ? await this.prisma.shopeeOrderSyncLog.findMany({
          where: {
            packageNumber: {
              in: packageNumbers,
            },
          },
          orderBy: [{ createdAt: 'desc' }],
        })
      : [];

    const latestLogByPackage = new Map<string, SyncLogRow>();
    const latestPrecheckLogByPackage = new Map<string, SyncLogRow>();
    for (const log of latestLogs) {
      if (log.packageNumber && !latestLogByPackage.has(log.packageNumber)) {
        latestLogByPackage.set(log.packageNumber, log);
      }
      if (
        log.packageNumber &&
        !latestPrecheckLogByPackage.has(log.packageNumber) &&
        ['shipping_parameter', 'shipping_parameter_mass'].includes(log.triggerType)
      ) {
        latestPrecheckLogByPackage.set(log.packageNumber, log);
      }
    }

    const items = rows.map((row) =>
      this.serializePackagePrecheckRow({
        row,
        latestLog: latestLogByPackage.get(row.packageNumber),
        latestPrecheckLog: latestPrecheckLogByPackage.get(row.packageNumber),
      }),
    );
    const filtered = this.filterPackagePrecheckByComputed(items, query);
    const total = filtered.length;
    const skip = (current - 1) * pageSize;

    return {
      data: filtered.slice(skip, skip + pageSize),
      total,
      success: true,
      current,
      pageSize,
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.erpOrder.findFirst({
      where: {
        OR: [{ id }, { orderNo: id }],
      },
      include: {
        shop: true,
        packages: true,
      },
    });

    if (!row) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return {
      success: true,
      data: this.serializeOrder(row),
    };
  }

  async auditOrders(payload: OrderOperationPayload) {
    return this.applyAuditStatus(payload, 'APPROVED');
  }

  async reverseAuditOrders(payload: OrderOperationPayload) {
    return this.applyAuditStatus(payload, 'REVERSED');
  }

  private buildPackagePrecheckWhere(
    query: PackagePrecheckQuery,
  ): Prisma.ErpOrderPackageWhereInput {
    const logisticsChannelId = query.logisticsChannelId
      ? Number(query.logisticsChannelId)
      : undefined;
    const timeField =
      query.timeField === 'lastSyncTime' ? 'lastSyncTime' : 'updatedAt';
    const timeRange =
      query.startTime || query.endTime
        ? {
            ...(query.startTime ? { gte: new Date(query.startTime) } : {}),
            ...(query.endTime ? { lte: new Date(query.endTime) } : {}),
          }
        : undefined;

    return {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.packageNumber
        ? {
            packageNumber: {
              contains: query.packageNumber,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.orderNo
        ? {
            orderNo: {
              contains: query.orderNo,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.orderSn
        ? {
            orderSn: {
              contains: query.orderSn,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.logisticsProfile ? { logisticsProfile: query.logisticsProfile } : {}),
      ...(query.shippingCarrier
        ? {
            shippingCarrier: {
              contains: query.shippingCarrier,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.packageStatus ? { packageStatus: query.packageStatus } : {}),
      ...(query.logisticsStatus ? { logisticsStatus: query.logisticsStatus } : {}),
      ...(query.shippingDocumentStatus
        ? { shippingDocumentStatus: query.shippingDocumentStatus }
        : {}),
      ...(query.logisticsChannelName
        ? {
            logisticsChannelName: {
              contains: query.logisticsChannelName,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(Number.isFinite(logisticsChannelId)
        ? { logisticsChannelId }
        : {}),
      ...(timeRange
        ? timeField === 'lastSyncTime'
          ? { lastSyncTime: timeRange }
          : { updatedAt: timeRange }
        : {}),
    };
  }

  private buildOrderWhere(
    query: Pick<OrderQuery, 'shopId' | 'orderNo' | 'packageNumber' | 'orderStatus' | 'currentTab'>,
  ): Prisma.ErpOrderWhereInput {
    const statusFilter = this.resolveOrderStatusFilter(query.orderStatus, query.currentTab);

    return {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.orderNo
        ? {
            orderNo: {
              contains: query.orderNo,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.packageNumber
        ? {
            packages: {
              some: {
                packageNumber: {
                  contains: query.packageNumber,
                  mode: 'insensitive',
                },
              },
            },
          }
        : {}),
      ...(statusFilter ? { orderStatus: statusFilter } : {}),
    };
  }

  private serializePackagePrecheckRow(input: {
    row: LogisticsPackageRow;
    latestLog?: SyncLogRow;
    latestPrecheckLog?: SyncLogRow;
  }) {
    const base = this.serializeLogisticsPackageRow(input.row);
    const channelStrategy = this.buildPackageChannelStrategy(input.row);
    const gates = this.buildPackagePrecheckGates({
      row: input.row,
      latestPrecheckLog: input.latestPrecheckLog,
      channelStrategy,
    });

    return {
      id: input.row.id,
      orderId: input.row.orderId || input.row.order?.id || input.row.id,
      packageNumber: input.row.packageNumber,
      orderNo: input.row.orderNo,
      orderSn: input.row.orderSn,
      shopId: input.row.shopId,
      shopName: input.row.order?.shop?.shopName || base.shopName,
      orderStatus:
        input.row.order?.orderStatus ||
        this.pickString(base as JsonRecord, ['order_status', 'orderStatus']) ||
        '',
      logisticsProfile: input.row.logisticsProfile || 'OTHER',
      logisticsChannelId: input.row.logisticsChannelId || undefined,
      logisticsChannelName: input.row.logisticsChannelName || '',
      shippingCarrier: input.row.shippingCarrier || '',
      serviceCode: input.row.serviceCode || '',
      trackingNumber: input.row.trackingNumber || '',
      packageStatus: input.row.packageStatus || 'PENDING',
      logisticsStatus: input.row.logisticsStatus || 'LOGISTICS_NOT_START',
      shippingDocumentStatus: input.row.shippingDocumentStatus || '',
      shippingDocumentType: input.row.shippingDocumentType || '',
      lastDocumentSyncTime: input.row.lastDocumentSyncTime?.toISOString?.() || null,
      canShip: gates.canShip,
      missingPreconditions: gates.missingPreconditions,
      gates: gates.gates,
      channelStrategy,
      latestSyncSummary: this.serializeSyncLogSummary(input.latestLog),
      latestPrecheckSummary: this.serializeSyncLogSummary(input.latestPrecheckLog),
      sourceSummary: {
        packageSource: input.row.lastSyncTime ? 'REALTIME_SYNCED' : 'DB_RAW_JSON',
        rawFragment: Boolean(input.row.rawFragment),
        sourceRaw: Boolean(input.row.sourceRaw),
        lastSyncTime: input.row.lastSyncTime?.toISOString?.() || null,
        latestPackageUpdateTime:
          input.row.latestPackageUpdateTime?.toISOString?.() || input.row.updatedAt.toISOString(),
      },
      commonFailureReasons: this.buildCommonFailureReasons(input.row, input.latestPrecheckLog),
      precheckSource: input.latestPrecheckLog
        ? 'package_master+latest_shipping_parameter_log'
        : 'package_master+local_gates',
      updatedAt: input.row.updatedAt.toISOString(),
      lastSyncTime: input.row.lastSyncTime?.toISOString?.() || null,
    };
  }

  private filterPackagePrecheckByComputed(
    items: Array<Record<string, unknown>>,
    query: PackagePrecheckQuery,
  ) {
    if (query.canShip === undefined || query.canShip === '') {
      return items;
    }
    const expected = query.canShip === 'true';
    return items.filter((item) => Boolean(item.canShip) === expected);
  }

  private serializeSyncLogSummary(log?: SyncLogRow) {
    if (!log) {
      return null;
    }

    return {
      triggerType: log.triggerType,
      resultStatus: log.resultStatus,
      message: log.message,
      createdAt: log.createdAt.toISOString(),
      changedFields: Array.isArray(log.changedFields) ? log.changedFields : [],
      requestPayloadSummary:
        log.requestPayloadSummary &&
        typeof log.requestPayloadSummary === 'object' &&
        !Array.isArray(log.requestPayloadSummary)
          ? log.requestPayloadSummary
          : null,
    };
  }

  private buildPackagePrecheckGates(input: {
    row: LogisticsPackageRow;
    latestPrecheckLog?: SyncLogRow;
    channelStrategy: {
      logisticsProfile: string;
      prefersMass: boolean;
      supportsMass: boolean;
      supportsPickupUpdate: boolean;
      supportsShippingDocument: boolean;
      parameterNotes: string[];
    };
  }) {
    const orderStatus = input.row.order?.orderStatus || '';
    const logisticsStatus = input.row.logisticsStatus || '';
    const shippingDocumentStatus = input.row.shippingDocumentStatus || '';
    const packageStatus = input.row.packageStatus || '';

    const invoiceGate =
      orderStatus === 'PENDING_INVOICE'
        ? {
            pass: false,
            reasons: ['订单仍处于 PENDING_INVOICE，需先调用 add_invoice_data。'],
          }
        : { pass: true, reasons: [] as string[] };

    const packageGateReasons: string[] = [];
    if (!['READY_TO_SHIP', 'RETRY_SHIP', 'PROCESSED'].includes(orderStatus)) {
      packageGateReasons.push(`订单状态 ${orderStatus || '-'} 不在履约窗口。`);
    }
    if (['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED', 'CANCELLED', 'TO_RETURN'].includes(orderStatus)) {
      packageGateReasons.push(`订单已进入 ${orderStatus}，不应再次执行 ship。`);
    }
    if (packageStatus && packageStatus === 'PROCESSED' && logisticsStatus === 'LOGISTICS_REQUEST_CREATED') {
      packageGateReasons.push('包裹已进入 LOGISTICS_REQUEST_CREATED，通常表示已开始物流请求。');
    }
    const packageGate = {
      pass: packageGateReasons.length === 0,
      reasons: packageGateReasons,
    };

    const documentGateReasons: string[] = [];
    if (['REQUESTED', 'PROCESSING', 'READY'].includes(shippingDocumentStatus)) {
      documentGateReasons.push(`面单状态为 ${shippingDocumentStatus}，包裹已进入面单流程。`);
    }
    const documentGate = {
      pass: documentGateReasons.length === 0,
      reasons: documentGateReasons,
    };

    const shippingParameterGateReasons: string[] = [];
    if (input.latestPrecheckLog) {
      if (input.latestPrecheckLog.resultStatus !== 'success') {
        shippingParameterGateReasons.push(
          input.latestPrecheckLog.message || '最近一次 shipping parameter 预检未通过。',
        );
      }
    } else {
      shippingParameterGateReasons.push('暂无 shipping parameter 预检结果，请先执行单包裹预检。');
    }
    const shippingParameterGate = {
      pass: shippingParameterGateReasons.length === 0,
      reasons: shippingParameterGateReasons,
    };

    const channelStrategyGate = {
      pass: true,
      reasons: [] as string[],
    };

    const missingPreconditions = [
      ...invoiceGate.reasons,
      ...packageGate.reasons,
      ...documentGate.reasons,
      ...shippingParameterGate.reasons,
      ...channelStrategyGate.reasons,
    ];

    return {
      canShip:
        invoiceGate.pass &&
        packageGate.pass &&
        documentGate.pass &&
        shippingParameterGate.pass &&
        channelStrategyGate.pass,
      missingPreconditions,
      gates: {
        invoiceGate,
        packageGate,
        documentGate,
        shippingParameterGate,
        channelStrategyGate,
      },
    };
  }

  private buildPackageChannelStrategy(row: LogisticsPackageRow) {
    const logisticsProfile = row.logisticsProfile || 'OTHER';
    if (logisticsProfile === 'SHOPEE_XPRESS') {
      return {
        logisticsProfile,
        prefersMass: true,
        supportsMass: true,
        supportsPickupUpdate: true,
        supportsShippingDocument: true,
        parameterNotes: [
          'Shopee Xpress 优先按 package_number 执行。',
          '同仓同渠道批量场景优先走 mass API。',
        ],
      };
    }
    if (logisticsProfile === 'DIRECT_DELIVERY') {
      return {
        logisticsProfile,
        prefersMass: false,
        supportsMass: true,
        supportsPickupUpdate: true,
        supportsShippingDocument: true,
        parameterNotes: [
          'Direct Delivery 仍按 package_number 主键处理。',
          '优先保留 pickup/address/time 调整能力。',
        ],
      };
    }
    return {
      logisticsProfile: 'OTHER',
      prefersMass: false,
      supportsMass: false,
      supportsPickupUpdate: true,
      supportsShippingDocument: true,
      parameterNotes: ['其他渠道走通用 Shopee logistics 语义，批量能力以真实返回为准。'],
    };
  }

  private buildCommonFailureReasons(row: LogisticsPackageRow, latestPrecheckLog?: SyncLogRow) {
    const reasons: string[] = [];
    if (latestPrecheckLog?.message) {
      reasons.push(latestPrecheckLog.message);
    }
    if (row.shippingDocumentStatus === 'FAILED') {
      reasons.push('shipping document 最近一次状态为 FAILED。');
    }
    if (row.logisticsStatus === 'LOGISTICS_PICKUP_RETRY') {
      reasons.push('当前为 pickup retry 场景，通常需要 update_shipping_order。');
    }
    return Array.from(new Set(reasons)).slice(0, 5);
  }

  private getCurrentTabStatuses(currentTab?: string) {
    switch (currentTab) {
      case 'pending':
        return [
          'UNPAID',
          'PENDING_INVOICE',
          'READY_TO_SHIP',
          'PROCESSED',
          'RETRY_SHIP',
          'IN_CANCEL',
          'TO_RETURN',
        ];
      case 'pendingAudit':
        return ['READY_TO_SHIP'];
      case 'pendingShipment':
        return ['READY_TO_SHIP', 'PROCESSED', 'RETRY_SHIP'];
      case 'shipped':
        return ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'];
      case 'cancelRefund':
        return ['IN_CANCEL', 'CANCELLED', 'TO_RETURN'];
      default:
        return undefined;
    }
  }

  private resolveOrderStatusFilter(orderStatus?: string, currentTab?: string) {
    const tabStatuses = this.getCurrentTabStatuses(currentTab);
    if (orderStatus && tabStatuses?.length) {
      return tabStatuses.includes(orderStatus) ? orderStatus : { in: [] as string[] };
    }
    if (orderStatus) {
      return orderStatus;
    }
    if (tabStatuses?.length) {
      return { in: tabStatuses };
    }
    return undefined;
  }

  private isPendingStatus(orderStatus: string) {
    return [
      'UNPAID',
      'PENDING_INVOICE',
      'READY_TO_SHIP',
      'PROCESSED',
      'RETRY_SHIP',
      'IN_CANCEL',
      'TO_RETURN',
    ].includes(orderStatus);
  }

  private serializeLogisticsPackageRow(row: LogisticsPackageRow) {
    const order = row.order;
    const raw =
      order?.rawJson && typeof order.rawJson === 'object' && !Array.isArray(order.rawJson)
        ? (order.rawJson as JsonRecord)
        : {};
    const fallbackRawPackage = this.findRawPackage(raw, row.packageNumber);
    const packageList = [this.serializePackageMaster(row, fallbackRawPackage)];

    return this.buildSerializedOrder({
      order: order
        ? {
            id: order.id,
            channel: order.channel,
            siteCode: order.siteCode,
            shopId: order.shopId,
            shopName: order.shop.shopName,
            orderNo: order.orderNo,
            orderStatus: order.orderStatus,
            buyerName: order.buyerName,
            currency: order.currency,
            totalAmount: order.totalAmount.toString(),
            createdAtRemote: order.createdAtRemote?.toISOString() || null,
            updatedAt: order.updatedAt.toISOString(),
          }
        : {
            id: row.orderId || row.id,
            channel: row.channel,
            siteCode: row.siteCode,
            shopId: row.shopId,
            shopName: '-',
            orderNo: row.orderNo,
            orderStatus: '',
            buyerName: null,
            currency: 'BRL',
            totalAmount: '0.00',
            createdAtRemote: null,
            updatedAt: row.updatedAt.toISOString(),
          },
      raw,
      packageList,
      hasPackageMaster: true,
    });
  }

  private serializeOrder(row: OrderRow) {
    const raw = this.toRecord(row.rawJson);
    const packageList = this.buildPackageList(raw, row.packages);

    return this.buildSerializedOrder({
      order: {
        id: row.id,
        channel: row.channel,
        siteCode: row.siteCode,
        shopId: row.shopId,
        shopName: row.shop.shopName,
        orderNo: row.orderNo,
        orderStatus: row.orderStatus,
        buyerName: row.buyerName,
        currency: row.currency,
        totalAmount: row.totalAmount.toString(),
        createdAtRemote: row.createdAtRemote?.toISOString() || null,
        updatedAt: row.updatedAt.toISOString(),
      },
      raw,
      packageList,
      hasPackageMaster: row.packages.length > 0,
    });
  }

  private buildSerializedOrder(input: {
    order: {
      id: string;
      channel: string;
      siteCode: string;
      shopId: string;
      shopName: string;
      orderNo: string;
      orderStatus: string;
      buyerName: string | null;
      currency: string;
      totalAmount: string;
      createdAtRemote: string | null;
      updatedAt: string;
    };
    raw: JsonRecord;
    packageList: JsonRecord[];
    hasPackageMaster: boolean;
  }) {
    const firstPackage = this.toRecord(input.packageList[0]);
    const trackingNumber =
      this.pickString(firstPackage, ['tracking_number', 'trackingNumber']) ||
      this.pickString(input.raw, ['tracking_number', 'trackingNumber']);
    const packageNumber =
      this.pickString(firstPackage, ['package_number', 'packageNumber']) || null;
    const syncMeta = this.buildSyncMeta(
      input.raw,
      input.order.updatedAt,
      input.packageList,
      input.hasPackageMaster,
    );

    return {
      id: input.order.id,
      channel: input.order.channel,
      siteCode: input.order.siteCode,
      shopId: input.order.shopId,
      shopName: input.order.shopName,
      orderNo: input.order.orderNo,
      createdAtRemote: input.order.createdAtRemote,
      updatedAt: input.order.updatedAt,
      order_sn:
        this.pickString(input.raw, ['order_sn', 'orderSn']) || input.order.orderNo,
      region: this.pickString(input.raw, ['region']) || input.order.siteCode,
      currency:
        this.pickString(input.raw, ['currency']) || input.order.currency,
      total_amount:
        this.pickString(input.raw, ['total_amount', 'totalAmount']) ||
        input.order.totalAmount,
      order_status:
        this.pickString(input.raw, ['order_status', 'orderStatus']) ||
        input.order.orderStatus,
      audit_status:
        this.pickString(input.raw, ['audit_status', 'auditStatus']) || null,
      buyer_name: input.order.buyerName,
      buyer_username:
        this.pickString(input.raw, [
          'buyer_username',
          'buyer_user_name',
          'buyerName',
        ]) || input.order.buyerName,
      buyer_user_id: this.pickNumber(input.raw, ['buyer_user_id', 'buyerUserId']),
      message_to_seller:
        this.pickString(input.raw, ['message_to_seller', 'messageToSeller']) || null,
      payment_method:
        this.pickString(input.raw, ['payment_method', 'paymentMethod']) || null,
      shipping_carrier:
        this.pickString(input.raw, ['shipping_carrier', 'shippingCarrier']) || null,
      checkout_shipping_carrier:
        this.pickString(input.raw, [
          'checkout_shipping_carrier',
          'checkoutShippingCarrier',
        ]) || null,
      create_time:
        this.pickNumber(input.raw, ['create_time', 'createTime']) ||
        this.toUnixString(input.order.createdAtRemote),
      update_time:
        this.pickNumber(input.raw, ['update_time', 'updateTime']) ||
        this.toUnixString(input.order.updatedAt),
      days_to_ship: this.pickNumber(input.raw, ['days_to_ship', 'daysToShip']),
      ship_by_date: this.pickNumber(input.raw, ['ship_by_date', 'shipByDate']),
      estimated_shipping_fee: this.pickNumber(input.raw, [
        'estimated_shipping_fee',
        'estimatedShippingFee',
      ]),
      actual_shipping_fee: this.pickNumber(input.raw, [
        'actual_shipping_fee',
        'actualShippingFee',
      ]),
      recipient_address:
        this.pickObject(input.raw, ['recipient_address', 'recipientAddress']) || null,
      cancel_by: this.pickString(input.raw, ['cancel_by', 'cancelBy']) || null,
      cancel_reason:
        this.pickString(input.raw, ['cancel_reason', 'cancelReason']) || null,
      buyer_cancel_reason:
        this.pickString(input.raw, [
          'buyer_cancel_reason',
          'buyerCancelReason',
        ]) || null,
      buyer_cpf_id:
        this.pickString(input.raw, ['buyer_cpf_id', 'buyerCpfId']) || null,
      buyer_cnpj_id:
        this.pickString(input.raw, [
          'buyer_cnpj_id',
          'buyerCnpjId',
          'tax_id',
        ]) || null,
      fulfillment_flag:
        this.pickString(input.raw, ['fulfillment_flag', 'fulfillmentFlag']) || null,
      pickup_done_time:
        this.pickNumber(input.raw, ['pickup_done_time', 'pickupDoneTime']),
      package_list: input.packageList,
      package_number: packageNumber,
      tracking_number: trackingNumber,
      reverse_shipping_fee: this.pickNumber(input.raw, [
        'reverse_shipping_fee',
        'reverseShippingFee',
      ]),
      order_chargeable_weight_gram: this.pickNumber(input.raw, [
        'order_chargeable_weight_gram',
        'orderChargeableWeightGram',
      ]),
      return_request_due_date: this.pickNumber(input.raw, [
        'return_request_due_date',
        'returnRequestDueDate',
      ]),
      edt_from: this.pickNumber(input.raw, ['edt_from', 'edtFrom']),
      edt_to: this.pickNumber(input.raw, ['edt_to', 'edtTo', 'edt']),
      payment_info: this.toArray(
        this.pickValue(input.raw, ['payment_info', 'paymentInfo']),
      ),
      invoice_data:
        this.pickObject(input.raw, ['invoice_data', 'invoiceInfo']) || null,
      note: this.pickString(input.raw, ['note', 'sellerNote']) || null,
      item_list: this.toArray(this.pickValue(input.raw, ['item_list', 'itemList'])),
      pending_terms: this.toArray(
        this.pickValue(input.raw, ['pending_terms', 'pendingTerms']),
      ),
      raw_source: input.hasPackageMaster ? 'db.packageMaster+rawJson' : 'db.rawJson',
      sync_meta: syncMeta,
    };
  }

  private buildPackageList(raw: JsonRecord, packageRows: OrderRow['packages']) {
    const rawPackages = this.toArray(this.pickValue(raw, ['package_list', 'packageList'])).map(
      (item) => this.toRecord(item),
    );
    const rawByPackageNumber = new Map(
      rawPackages
        .map((item) => [
          this.pickString(item, ['package_number', 'packageNumber']) || '',
          item,
        ] as const)
        .filter(([packageNumber]) => Boolean(packageNumber)),
    );

    if (packageRows.length === 0) {
      return rawPackages.map((item) => this.serializeRawPackage(item));
    }

    const serialized = packageRows.map((row) =>
      this.serializePackageMaster(row, rawByPackageNumber.get(row.packageNumber)),
    );
    const masterNumbers = new Set(packageRows.map((row) => row.packageNumber));
    const extraRawPackages = rawPackages
      .filter((item) => {
        const packageNumber =
          this.pickString(item, ['package_number', 'packageNumber']) || '';
        return packageNumber && !masterNumbers.has(packageNumber);
      })
      .map((item) => this.serializeRawPackage(item));

    return [...serialized, ...extraRawPackages];
  }

  private serializePackageMaster(
    row: OrderRow['packages'][number] | LogisticsPackageRow,
    fallbackRaw?: JsonRecord,
  ) {
    const base =
      row.rawFragment && typeof row.rawFragment === 'object' && !Array.isArray(row.rawFragment)
        ? (row.rawFragment as JsonRecord)
        : fallbackRaw || {};
    const realFieldList = this.buildPackageRealFields(row, base);

    return {
      ...base,
      package_number: row.packageNumber,
      tracking_number:
        row.trackingNumber ||
        this.pickString(base, ['tracking_number', 'trackingNumber']) ||
        null,
      package_status:
        row.packageStatus ||
        this.pickString(base, ['package_status', 'packageStatus']) ||
        null,
      fulfillment_status:
        row.packageFulfillmentStatus ||
        this.pickString(base, [
          'fulfillment_status',
          'packageFulfillmentStatus',
          'fulfillmentStatus',
        ]) ||
        null,
      logistics_status:
        row.logisticsStatus ||
        this.pickString(base, ['logistics_status', 'logisticsStatus']) ||
        null,
      shipping_carrier:
        row.shippingCarrier ||
        this.pickString(base, ['shipping_carrier', 'shippingCarrier']) ||
        null,
      logistics_channel_id:
        row.logisticsChannelId ??
        this.pickNumber(base, ['logistics_channel_id', 'logisticsChannelId']) ??
        null,
      logistics_channel_name:
        row.logisticsChannelName ||
        this.pickString(base, [
          'logistics_channel_name',
          'logisticsChannelName',
          'channel_name',
        ]) ||
        null,
      service_code:
        row.serviceCode || this.pickString(base, ['service_code', 'serviceCode']) || null,
      shipping_document_status:
        row.shippingDocumentStatus ||
        this.pickString(base, [
          'shipping_document_status',
          'shippingDocumentStatus',
        ]) ||
        null,
      shipping_document_type:
        row.shippingDocumentType ||
        this.pickString(base, [
          'shipping_document_type',
          'shippingDocumentType',
        ]) ||
        null,
      document_url:
        row.documentUrl || this.pickString(base, ['document_url', 'documentUrl']) || null,
      download_ref:
        row.downloadRef ||
        this.pickValue(base, ['download_ref', 'downloadRef']) ||
        null,
      logistics_profile:
        row.logisticsProfile ||
        this.pickString(base, ['logistics_profile', 'logisticsProfile']) ||
        'OTHER',
      parcel_item_count:
        row.parcelItemCount ||
        this.pickNumber(base, ['parcel_item_count', 'parcelItemCount', 'item_count']) ||
        0,
      last_document_sync_time:
        row.lastDocumentSyncTime?.toISOString?.() ||
        row.lastDocumentSyncTime ||
        this.pickString(base, [
          'last_document_sync_time',
          'lastDocumentSyncTime',
        ]) ||
        null,
      latest_package_update_time:
        row.latestPackageUpdateTime?.toISOString?.() ||
        row.latestPackageUpdateTime ||
        row.updatedAt.toISOString(),
      update_time:
        row.latestPackageUpdateTime?.toISOString?.() ||
        row.latestPackageUpdateTime ||
        row.updatedAt.toISOString(),
      _source: row.lastSyncTime ? 'REALTIME_SYNCED' : 'DB_RAW_JSON',
      _real_fields: realFieldList,
    };
  }

  private serializeRawPackage(pkg: JsonRecord) {
    return {
      ...pkg,
      _source:
        this.pickString(pkg, ['_source']) ||
        (this.pickString(pkg, ['package_number', 'packageNumber'])
          ? 'DB_RAW_JSON'
          : 'FALLBACK'),
      _real_fields:
        this.toArray(this.pickValue(pkg, ['_real_fields'])).length > 0
          ? this.toArray(this.pickValue(pkg, ['_real_fields']))
          : [
              'package_number',
              'fulfillment_status',
              'logistics_status',
              'logistics_channel_id',
            ],
    };
  }

  private buildPackageRealFields(
    row: OrderRow['packages'][number] | LogisticsPackageRow,
    base: JsonRecord,
  ) {
    const stored = this.toArray(this.pickValue(base, ['_real_fields'])).filter(
      (item): item is string => typeof item === 'string',
    );
    const inferred = [
      row.packageNumber ? 'package_number' : undefined,
      row.trackingNumber ? 'tracking_number' : undefined,
      row.packageStatus ? 'package_status' : undefined,
      row.packageFulfillmentStatus ? 'fulfillment_status' : undefined,
      row.logisticsStatus ? 'logistics_status' : undefined,
      row.shippingCarrier ? 'shipping_carrier' : undefined,
      row.logisticsChannelId ? 'logistics_channel_id' : undefined,
      row.logisticsChannelName ? 'logistics_channel_name' : undefined,
      row.serviceCode ? 'service_code' : undefined,
      row.shippingDocumentStatus ? 'shipping_document_status' : undefined,
      row.shippingDocumentType ? 'shipping_document_type' : undefined,
      row.documentUrl ? 'document_url' : undefined,
      row.lastDocumentSyncTime ? 'last_document_sync_time' : undefined,
    ].filter((item): item is string => Boolean(item));

    return Array.from(new Set([...stored, ...inferred]));
  }

  private findRawPackage(raw: JsonRecord, packageNumber: string) {
    return this.toArray(this.pickValue(raw, ['package_list', 'packageList']))
      .map((item) => this.toRecord(item))
      .find(
        (item) =>
          this.pickString(item, ['package_number', 'packageNumber']) === packageNumber,
      );
  }

  private buildSyncMeta(
    raw: JsonRecord,
    updatedAt: string,
    packageList: JsonRecord[],
    hasPackageMaster: boolean,
  ) {
    const storedMeta = this.pickObject(raw, ['_sync_meta']) || {};
    const hasPaymentInfo = this.hasAnyPath(raw, [
      'payment_info',
      'paymentInfo',
      'payment_info_list',
      'paymentInfoList',
    ]);
    const hasInvoice = this.hasAnyPath(raw, [
      'invoice_data',
      'invoiceInfo',
      'invoice_data_info',
    ]);
    const hasAddress = this.hasAnyPath(raw, ['recipient_address', 'recipientAddress']);
    const hasTracking =
      this.hasAnyPath(raw, ['tracking_number', 'trackingNumber']) ||
      packageList.some(
        (item) =>
          Boolean(this.pickString(item, ['tracking_number', 'trackingNumber'])),
      );
    const hasPackageStatus = packageList.some(
      (item) =>
        Boolean(
          this.pickString(item, [
            'package_status',
            'packageStatus',
            'fulfillment_status',
          ]),
        ),
    );
    const hasLogisticsStatus =
      this.hasAnyPath(raw, ['logistics_status', 'logisticsStatus']) ||
      packageList.some(
        (item) =>
          Boolean(this.pickString(item, ['logistics_status', 'logisticsStatus'])),
      );
    const hasLogisticsChannelId = packageList.some(
      (item) =>
        this.pickNumber(item, ['logistics_channel_id', 'logisticsChannelId']) !== undefined,
    );
    const hasServiceCode = packageList.some((item) =>
      Boolean(this.pickString(item, ['service_code', 'serviceCode'])),
    );
    const hasShippingDocumentStatus = packageList.some((item) =>
      Boolean(
        this.pickString(item, ['shipping_document_status', 'shippingDocumentStatus']),
      ),
    );
    const hasShippingDocumentType = packageList.some((item) =>
      Boolean(
        this.pickString(item, ['shipping_document_type', 'shippingDocumentType']),
      ),
    );

    const fallbackFields =
      this.toArray(this.pickValue(storedMeta, ['fallback_fields'])).length > 0
        ? this.toArray(this.pickValue(storedMeta, ['fallback_fields']))
        : [
            ...(packageList.length === 0 ? ['package_list'] : []),
            ...(!hasTracking ? ['tracking_number'] : []),
            ...(!hasPackageStatus ? ['package_status'] : []),
            ...(!hasLogisticsStatus ? ['logistics_status'] : []),
            ...(!hasLogisticsChannelId ? ['logistics_channel_id'] : []),
            ...(!hasServiceCode ? ['service_code'] : []),
            ...(!hasShippingDocumentStatus ? ['shipping_document_status'] : []),
            ...(!hasShippingDocumentType ? ['shipping_document_type'] : []),
            ...(!hasAddress ? ['recipient_address'] : []),
            ...(!hasPaymentInfo ? ['payment_info'] : []),
            ...(!hasInvoice ? ['invoice_data'] : []),
          ];

    return {
      last_sync_time: this.pickString(storedMeta, ['last_sync_time']) || updatedAt,
      last_trigger_type:
        this.pickString(storedMeta, ['last_trigger_type']) || 'sync_recent',
      last_result: this.pickString(storedMeta, ['last_result']) || 'success',
      last_message: this.pickString(storedMeta, ['last_message']) || null,
      detail_source:
        this.pickString(storedMeta, ['detail_source']) ||
        (this.pickString(raw, ['buyer_username', 'message_to_seller'])
          ? 'DB_RAW_JSON'
          : 'FALLBACK'),
      package_source:
        this.pickString(storedMeta, ['package_source']) ||
        (hasPackageMaster
          ? 'REALTIME_SYNCED'
          : packageList.length > 0
            ? 'DB_RAW_JSON'
            : 'FALLBACK'),
      payment_source:
        this.pickString(storedMeta, ['payment_source']) ||
        (hasPaymentInfo ? 'DB_RAW_JSON' : 'FALLBACK'),
      invoice_source:
        this.pickString(storedMeta, ['invoice_source']) ||
        (hasInvoice ? 'DB_RAW_JSON' : 'FALLBACK'),
      address_source:
        this.pickString(storedMeta, ['address_source']) ||
        (hasAddress ? 'DB_RAW_JSON' : 'FALLBACK'),
      status_source:
        this.pickString(storedMeta, ['status_source']) ||
        (this.pickString(raw, ['order_status', 'orderStatus'])
          ? 'DB_RAW_JSON'
          : 'FALLBACK'),
      fallback_fields: fallbackFields,
    };
  }

  private toRecord(value: unknown): JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as JsonRecord)
      : {};
  }

  private toArray(value: unknown) {
    return Array.isArray(value) ? value : [];
  }

  private readPath(source: JsonRecord, path: string): unknown {
    if (path in source) {
      return source[path];
    }

    return path.split('.').reduce<unknown>((current, segment) => {
      if (typeof current !== 'object' || current === null || Array.isArray(current)) {
        return undefined;
      }
      return (current as JsonRecord)[segment];
    }, source);
  }

  private pickValue(source: JsonRecord, paths: string[]) {
    for (const path of paths) {
      const value = this.readPath(source, path);
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return undefined;
  }

  private pickString(source: JsonRecord, paths: string[]) {
    const value = this.pickValue(source, paths);
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
    return undefined;
  }

  private pickNumber(source: JsonRecord, paths: string[]) {
    const value = this.pickValue(source, paths);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private pickObject(source: JsonRecord, paths: string[]) {
    const value = this.pickValue(source, paths);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as JsonRecord)
      : undefined;
  }

  private toUnixString(value: string | null) {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return Math.floor(date.getTime() / 1000);
  }

  private hasAnyPath(source: JsonRecord, paths: string[]) {
    return paths.some((path) => this.hasPath(source, path));
  }

  private hasPath(source: JsonRecord, path: string): boolean {
    const segments = path.split('.');
    let current: unknown = source;

    for (const segment of segments) {
      if (typeof current !== 'object' || current === null || Array.isArray(current)) {
        return false;
      }
      if (!(segment in (current as JsonRecord))) {
        return false;
      }
      current = (current as JsonRecord)[segment];
    }

    return true;
  }

  private async applyAuditStatus(
    payload: OrderOperationPayload,
    auditStatus: 'APPROVED' | 'REVERSED',
  ) {
    const targetIds = await this.resolveOperationTargetIds(payload);
    if (targetIds.length === 0) {
      throw new NotFoundException('No orders found for operation.');
    }

    const rows = await this.prisma.erpOrder.findMany({
      where: {
        id: { in: targetIds },
      },
      select: {
        id: true,
        rawJson: true,
      },
    });

    await this.prisma.$transaction(
      rows.map((row) => {
        const raw = this.toRecord(row.rawJson);
        const nextRaw: JsonRecord = {
          ...raw,
          audit_status: auditStatus,
          auditStatus,
        };

        return this.prisma.erpOrder.update({
          where: { id: row.id },
          data: {
            rawJson: nextRaw as Prisma.InputJsonValue,
          },
        });
      }),
    );

    return {
      success: true,
      data: {
        affected: rows.length,
      },
    };
  }

  private async resolveOperationTargetIds(payload: OrderOperationPayload) {
    const ids = Array.from(
      new Set(
        [payload.orderId, ...(payload.orderIds || [])].filter(
          (item): item is string => Boolean(item),
        ),
      ),
    );

    if (ids.length > 0) {
      return ids;
    }

    const orderRefs = Array.from(
      new Set(
        [payload.orderNo, payload.orderSn, ...(payload.orderNos || [])].filter(
          (item): item is string => Boolean(item),
        ),
      ),
    );

    if (orderRefs.length === 0) {
      return [];
    }

    const rows = await this.prisma.erpOrder.findMany({
      where: {
        ...(payload.shopId ? { shopId: payload.shopId } : {}),
        orderNo: { in: orderRefs },
      },
      select: {
        id: true,
      },
    });

    return rows.map((row) => row.id);
  }
}
