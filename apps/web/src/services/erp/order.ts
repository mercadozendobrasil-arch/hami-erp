import { request } from '@umijs/max';
import {
  applyOrderOperation,
  deleteRule,
  mockGetOrderDetail,
  mockGetRuleDetail,
  mockQueryAfterSales,
  mockQueryLogisticsOrders,
  mockQueryLogs,
  mockQueryOrders,
  mockQueryRules,
  mockQueryWarehouseOrders,
  saveRule,
  summarizeOrders,
  toggleRule,
} from './order.mock';
import {
  getBranchReason,
  getFulfillmentStage,
  getFulfillmentStageDescription,
  getNextActionSuggestion,
  getStatusTrail,
} from './orderFlow';
import { ensureOrderPlatformProfile } from './orderPlatform';
import orderNormalize from './order.normalize';

type RawOrderRecord = Record<string, unknown>;

const allowOrderMockFallback =
  process.env.NODE_ENV === 'development' &&
  process.env.ERP_ORDER_FALLBACK_MOCK !== 'false';

const {
  isNormalizedOrderDetail,
  normalizeBackendOrder,
  normalizeBackendOrderDetail,
} = orderNormalize;

async function requestWithFallback<T>(
  url: string,
  method: 'GET' | 'POST',
  fallback: () => Promise<T> | T,
  params?: Record<string, unknown>,
  allowFallback = allowOrderMockFallback,
) {
  try {
    if (method === 'GET') {
      return await request<T>(url, { method, params });
    }
    return await request<T>(url, { method, data: params });
  } catch (error) {
    if (!allowFallback) {
      throw error;
    }

    console.warn(
      `[erp-order] Falling back to mock data for ${url}.`,
      error,
    );
    return fallback();
  }
}

async function requestStrict<T>(
  url: string,
  method: 'GET' | 'POST',
  params?: Record<string, unknown>,
) {
  if (method === 'GET') {
    return request<T>(url, { method, params });
  }
  return request<T>(url, { method, data: params });
}

function normalizeListResponse<T>(response: API.ListResponse<T>) {
  return {
    ...response,
    success: response.success ?? true,
    total: response.total ?? 0,
    data: response.data || [],
  };
}

function normalizeOrderListResponse(response: API.ListResponse<ERP.OrderListItem>) {
  return normalizeListResponse({
    ...response,
    data: (response.data || []).map((item) => ensureOrderPlatformProfile(item)),
  });
}

function normalizeBackendOrderListResponse(response: API.ListResponse<RawOrderRecord>) {
  return normalizeListResponse({
    ...response,
    data: (response.data || []).map((item) => normalizeBackendOrder(item)),
  });
}

function getOperationTargets(payload: ERP.OrderOperationPayload) {
  const explicitTargets =
    payload.orders?.map((order) => ({
      shopId: order.shopId,
      orderSn: order.orderSn,
      packageNumber: order.packageNumber,
      shippingDocumentType: order.shippingDocumentType,
    })) || [];

  if (explicitTargets.length) {
    return explicitTargets;
  }

  const orderSn = payload.orderSn || payload.orderNo || payload.orderId;
  if (payload.shopId && orderSn) {
    return [
      {
        shopId: payload.shopId,
        orderSn,
        packageNumber: payload.packageNumber,
        shippingDocumentType: payload.shippingDocumentType,
      },
    ];
  }

  return [];
}

function getRequiredTarget(payload: ERP.OrderOperationPayload, action: string) {
  const [target] = getOperationTargets(payload);
  if (!target?.shopId || !target.orderSn) {
    throw new Error(`Missing shopId or orderSn for ${action}.`);
  }
  return target;
}

function toPackagePrecheckItem(item: ERP.OrderListItem): ERP.PackagePrecheckItem {
  const firstPackage = item.packageList?.[0];
  const packageNumber = item.packageNumber || firstPackage?.packageNumber || item.orderSn;
  const logisticsProfile =
    firstPackage?.logisticsProfile === 'SHOPEE_XPRESS' ||
    firstPackage?.logisticsProfile === 'DIRECT_DELIVERY'
      ? firstPackage.logisticsProfile
      : 'OTHER';
  const missingPreconditions = [
    ...(item.trackingNo && item.trackingNo !== '-' ? [] : ['tracking_number']),
    ...(firstPackage?.shippingDocumentStatus ? [] : ['shipping_document']),
  ];
  const now = item.updateTime || item.lastSyncTime || new Date().toISOString();

  return {
    id: `${item.id}:${packageNumber}`,
    orderId: item.id,
    packageNumber,
    orderNo: item.orderNo,
    orderSn: item.orderSn,
    shopId: item.platformShopId,
    shopName: item.shopName,
    orderStatus: item.orderStatus,
    logisticsProfile,
    logisticsChannelId: firstPackage?.logisticsChannelId,
    logisticsChannelName: item.logisticsChannel,
    shippingCarrier: item.shippingCarrier,
    serviceCode: firstPackage?.serviceCode,
    trackingNumber: item.trackingNo === '-' ? undefined : item.trackingNo,
    packageStatus: item.packageStatus,
    logisticsStatus: item.logisticsStatus,
    shippingDocumentStatus: firstPackage?.shippingDocumentStatus,
    shippingDocumentType: firstPackage?.shippingDocumentType,
    lastDocumentSyncTime: firstPackage?.lastDocumentSyncTime,
    canShip: missingPreconditions.length === 0,
    missingPreconditions,
    gates: {
      invoiceGate: { pass: true, reasons: [] },
      packageGate: { pass: Boolean(packageNumber), reasons: packageNumber ? [] : ['missing_package_number'] },
      documentGate: {
        pass: Boolean(firstPackage?.shippingDocumentStatus),
        reasons: firstPackage?.shippingDocumentStatus ? [] : ['missing_shipping_document'],
      },
      shippingParameterGate: { pass: true, reasons: [] },
      channelStrategyGate: { pass: true, reasons: [] },
    },
    channelStrategy: {
      logisticsProfile,
      prefersMass: logisticsProfile === 'SHOPEE_XPRESS',
      supportsMass: logisticsProfile === 'SHOPEE_XPRESS',
      supportsPickupUpdate: logisticsProfile !== 'OTHER',
      supportsShippingDocument: true,
      parameterNotes: [],
    },
    latestSyncSummary: null,
    latestPrecheckSummary: null,
    sourceSummary: {
      packageSource: 'DB_RAW_JSON',
      rawFragment: Boolean(firstPackage),
      sourceRaw: Boolean(firstPackage),
      lastSyncTime: item.lastSyncTime,
      latestPackageUpdateTime: firstPackage?.latestPackageUpdateTime,
    },
    commonFailureReasons: missingPreconditions,
    precheckSource: 'ERP_ORDER_PROJECTION',
    updatedAt: now,
    lastSyncTime: item.lastSyncTime,
  };
}

function mockQueryPackagePrecheck(
  params: ERP.PackagePrecheckQueryParams,
): API.ListResponse<ERP.PackagePrecheckItem> {
  const response = mockQueryLogisticsOrders(params as ERP.OrderQueryParams);
  return normalizeListResponse({
    ...response,
    data: response.data.map((item) => {
      const packageRow = item.packageList[0];
      const logisticsProfile =
        packageRow?.logisticsProfile === 'SHOPEE_XPRESS' ||
        packageRow?.logisticsProfile === 'DIRECT_DELIVERY'
          ? packageRow.logisticsProfile
          : 'OTHER';
      const shippingDocumentStatus = packageRow?.shippingDocumentStatus;
      const shippingDocumentType = packageRow?.shippingDocumentType;
      const missingPreconditions = [
        ...(shippingDocumentStatus ? [] : ['shipping_document']),
        ...(item.trackingNo && item.trackingNo !== '-' ? [] : ['tracking_number']),
      ];
      const now = item.updateTime || item.lastSyncTime || new Date().toISOString();
      return {
        id: `${item.id}:${item.packageNumber || item.orderSn}`,
        orderId: item.id,
        packageNumber: item.packageNumber || `${item.orderSn}-PKG1`,
        orderNo: item.orderNo,
        orderSn: item.orderSn,
        shopId: item.platformShopId,
        shopName: item.shopName,
        orderStatus: item.orderStatus,
        logisticsProfile,
        logisticsChannelId: packageRow?.logisticsChannelId,
        logisticsChannelName: item.logisticsChannel,
        shippingCarrier: item.shippingCarrier,
        serviceCode: packageRow?.serviceCode,
        trackingNumber: item.trackingNo === '-' ? undefined : item.trackingNo,
        packageStatus: item.packageStatus,
        logisticsStatus: item.logisticsStatus,
        shippingDocumentStatus,
        shippingDocumentType,
        lastDocumentSyncTime: packageRow?.lastDocumentSyncTime,
        canShip: missingPreconditions.length === 0,
        missingPreconditions,
        gates: {
          invoiceGate: { pass: true, reasons: [] },
          packageGate: { pass: Boolean(item.packageNumber), reasons: item.packageNumber ? [] : ['missing_package_number'] },
          documentGate: {
            pass: Boolean(shippingDocumentStatus),
            reasons: shippingDocumentStatus ? [] : ['missing_shipping_document'],
          },
          shippingParameterGate: { pass: true, reasons: [] },
          channelStrategyGate: { pass: true, reasons: [] },
        },
        channelStrategy: {
          logisticsProfile,
          prefersMass: logisticsProfile === 'SHOPEE_XPRESS',
          supportsMass: logisticsProfile === 'SHOPEE_XPRESS',
          supportsPickupUpdate: logisticsProfile !== 'OTHER',
          supportsShippingDocument: true,
          parameterNotes: [],
        },
        latestSyncSummary: null,
        latestPrecheckSummary: null,
        sourceSummary: {
          packageSource: 'FALLBACK',
          rawFragment: false,
          sourceRaw: false,
          lastSyncTime: item.lastSyncTime,
          latestPackageUpdateTime: packageRow?.latestPackageUpdateTime,
        },
        commonFailureReasons: missingPreconditions,
        precheckSource: 'LOCAL_FALLBACK',
        updatedAt: now,
        lastSyncTime: item.lastSyncTime,
      };
    }),
  });
}

export async function queryOrders(params: ERP.OrderQueryParams) {
  const response = await requestStrict<API.ListResponse<ERP.OrderListItem>>(
    '/api/erp/orders',
    'GET',
    params,
  );
  return normalizeOrderListResponse(response);
}

export async function queryAbnormalOrders(params: ERP.OrderQueryParams) {
  const response = await requestStrict<API.ListResponse<ERP.OrderListItem>>(
    '/api/erp/orders',
    'GET',
    {
      ...params,
      hasActiveException: true,
    },
  );
  return normalizeOrderListResponse(response);
}

export async function queryLogisticsOrders(params: ERP.OrderQueryParams) {
  const response = await requestWithFallback<API.ListResponse<ERP.OrderListItem>>(
    '/api/erp/orders',
    'GET',
    () => mockQueryLogisticsOrders(params),
    params,
  );
  return normalizeOrderListResponse(response);
}

export async function queryPackagePrecheck(params: ERP.PackagePrecheckQueryParams) {
  const response = await requestWithFallback<API.ListResponse<ERP.OrderListItem>>(
    '/api/erp/orders',
    'GET',
    () => mockQueryLogisticsOrders(params as ERP.OrderQueryParams),
    params as Record<string, unknown>,
  );
  const normalized = normalizeOrderListResponse(response);
  return normalizeListResponse({
    ...normalized,
    data: normalized.data.map(toPackagePrecheckItem),
  });
}

export async function queryWarehouseOrders(params: ERP.OrderQueryParams) {
  const response = await requestWithFallback<API.ListResponse<ERP.OrderListItem>>(
    '/api/erp/orders',
    'GET',
    () => mockQueryWarehouseOrders(params),
    { ...params, currentTab: params.currentTab || 'pendingShipment' },
    true,
  );
  return normalizeOrderListResponse(response);
}

export async function getOrderDetail(id: string, shopId?: string) {
  const response = await requestStrict<ERP.ApiResponse<ERP.OrderDetail | RawOrderRecord>>(
    `/api/erp/orders/${id}`,
    'GET',
    { shopId },
  );
  return isNormalizedOrderDetail(response.data)
    ? ensureOrderPlatformProfile(response.data)
    : normalizeBackendOrderDetail(response.data as RawOrderRecord);
}

export async function syncOrder(orderSn: string, shopId: string) {
  return requestStrict<ERP.ApiResponse<{ jobId?: string; recordId?: string; status?: string }>>(
    `/api/erp/orders/${orderSn}/sync`,
    'POST',
    { shopId },
  );
}

export async function getOrderEscrow(orderSn: string, shopId: string) {
  return requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
    `/api/erp/orders/${orderSn}/escrow`,
    'GET',
    { shopId },
  );
}

export async function queryAfterSales(params: ERP.OrderQueryParams) {
  const response = await requestWithFallback<API.ListResponse<ERP.AfterSaleItem>>(
    '/api/after-sales',
    'GET',
    () => mockQueryAfterSales(params),
    params,
    true,
  );
  return normalizeListResponse({
    ...response,
    data: (response.data || []).map((item) => ({
      ...item,
      processingProfile:
        item.processingProfile ||
        ensureOrderPlatformProfile({
          id: item.sourceOrderId || item.id,
          orderNo: item.orderNo,
          platformOrderNo: item.orderNo,
          orderSn: item.orderNo,
          platform: item.platform || 'Shopee',
          platformChannel: item.platformChannel || 'SHOPEE',
          platformRegion: item.platformRegion || 'BR',
          platformShopId: '-',
          platformStatus: item.platformStatus || 'TO_RETURN',
          fulfillmentStage: getFulfillmentStage('TO_RETURN'),
          fulfillmentStageDescription: getFulfillmentStageDescription('TO_RETURN'),
          nextActionSuggestion: '转入退货退款处理',
          branchReason: item.reason,
          statusTrail: getStatusTrail('TO_RETURN'),
          shopName: item.shopName,
          buyerName: item.buyerName,
          buyerUserId: '-',
          messageToSeller: '-',
          items: '-',
          skuCount: 0,
          totalAmount: item.amount,
          currency: 'BRL',
          createTime: item.createdAt,
          updateTime: item.updatedAt,
          shipByDate: item.createdAt,
          daysToShip: 2,
          estimatedShippingFee: '0.00',
          actualShippingFee: '0.00',
          paymentMethod: '-',
          shippingCarrier: '-',
          checkoutShippingCarrier: '-',
          reverseShippingFee: '0.00',
          orderChargeableWeightGram: 0,
          pendingTerms: [],
          fulfillmentFlag: 'fulfilled_by_local_seller',
          packageNumber: `${item.orderNo}-PKG1`,
          packageCount: 1,
          packageStatus: 'PROCESSED',
          packageFulfillmentStatus: 'TO_RETURN',
          packageList: [
            {
              orderSn: item.orderNo,
              packageNumber: `${item.orderNo}-PKG1`,
              packageStatus: 'PROCESSED',
              packageFulfillmentStatus: 'TO_RETURN',
              fulfillmentStatus: 'TO_RETURN',
              logisticsStatus: 'LOGISTICS_DELIVERY_DONE',
              shippingCarrier: '-',
              logisticsChannelId: 0,
              trackingNumber: undefined,
              allowSelfDesignAwb: false,
              infoNeeded: [],
              parcelItemCount: 0,
              itemCount: 0,
              latestPackageUpdateTime: item.updatedAt,
              dataSource: 'FALLBACK',
              realFieldList: [],
              shipByDate: item.createdAt,
              updateTime: item.updatedAt,
              itemList: [],
            },
          ],
          lastSyncTime: item.updatedAt,
          syncMeta: {
            lastSyncTime: item.updatedAt,
            detailSource: 'FALLBACK',
            packageSource: 'FALLBACK',
            paymentSource: 'FALLBACK',
            invoiceSource: 'FALLBACK',
            addressSource: 'FALLBACK',
            statusSource: 'REALTIME_SYNCED',
            fallbackFields: [
              'package_list',
              'payment_info',
              'invoice_data',
              'recipient_address',
            ],
          },
          infoNeeded: [],
          orderStatus: 'TO_RETURN',
          payStatus: 'PAID',
          auditStatus: 'APPROVED',
          deliveryStatus: 'TO_RETURN',
          afterSaleStatus: item.status,
          warehouseName: '-',
          logisticsCompany: '-',
          trackingNo: '-',
          tags: [],
          exceptionTags: [],
          hitRuleCodes: [],
          hitRuleNames: [],
          exceptionReason: item.reason,
          riskLevel: 'MEDIUM',
          suggestedAction: '联系买家确认',
          currentStatus: 'MANUAL_REVIEW',
          orderTime: item.createdAt,
          remark: '',
          locked: false,
          logisticsStatus: 'LOGISTICS_DELIVERY_DONE',
          logisticsChannel: '-',
          dispatchRecommendation: '-',
          deliveryAging: 0,
          freightEstimate: '0.00',
          warehouseStatus: 'ASSIGNED',
          allocationStrategy: '-',
          allocationReason: '-',
          stockWarning: '-',
          stockSufficient: true,
          recommendedWarehouse: '-',
        }).processingProfile,
    })),
  });
}

export async function queryOrderLogs(params: ERP.OrderLogQueryParams) {
  const response = await requestWithFallback<API.ListResponse<ERP.OrderLogItem>>(
    '/api/erp/orders/logs',
    'GET',
    () => mockQueryLogs(params),
    params,
    true,
  );
  return normalizeListResponse(response);
}

export async function queryShopeeSyncLogs(params: ERP.ShopeeSyncLogQueryParams) {
  const response = await requestStrict<API.ListResponse<ERP.ShopeeSyncLogItem>>(
    '/api/erp/sync-logs',
    'GET',
    params,
  );
  return normalizeListResponse(response);
}

export async function queryOrderRules(params: ERP.RuleQueryParams) {
  const response = await requestWithFallback<API.ListResponse<ERP.RuleConfigItem>>(
    '/api/rules',
    'GET',
    () => mockQueryRules(params),
    params,
    true,
  );
  return normalizeListResponse(response);
}

export async function getOrderRuleDetail(id: string) {
  const response = await requestWithFallback<ERP.ApiResponse<ERP.RuleConfigItem>>(
    `/api/rules/${id}`,
    'GET',
    () => ({ success: true, data: mockGetRuleDetail(id) }),
    undefined,
    true,
  );
  return response.data;
}

export async function getOrderOverview(currentTab?: string) {
  const response = await requestStrict<
    ERP.ApiResponse<{
      orderCount: number;
      todayOrderCount: number;
    }>
  >('/api/erp/dashboard/summary', 'GET');

  return {
    ...summarizeOrders(currentTab),
    total: response.data.orderCount,
    pendingCount: response.data.todayOrderCount,
  };
}

export async function queryDashboardSummary() {
  return requestStrict<
    ERP.ApiResponse<{
      shopCount: number;
      productCount: number;
      orderCount: number;
      todayOrderCount: number;
      todaySalesAmount: string;
    }>
  >('/api/erp/dashboard/summary', 'GET');
}

export async function addInvoiceData(payload: ERP.OrderOperationPayload) {
  return autoInvoiceOrder(payload);
}

export async function autoInvoiceOrder(payload: ERP.OrderOperationPayload) {
  const orderSn = payload.orderSn || payload.orderNo || payload.orderId;
  if (!orderSn) {
    throw new Error('Missing orderSn for auto invoice.');
  }
  if (!payload.shopId) {
    throw new Error('Missing shopId for auto invoice.');
  }

  const response = await requestStrict<
    ERP.ApiResponse<{
      fiscalDocumentId: string;
      shopeeInvoiceResult?: Record<string, unknown>;
      shippingDocumentJobId?: string;
      labelIds?: string[];
      nextStage?: string;
      nextAction?: string;
    }>
  >(`/api/erp/orders/${orderSn}/auto-invoice`, 'POST', {
    shopId: payload.shopId,
    type: 'NFE',
    packageNumber: payload.packageNumber,
    shippingDocumentType: payload.shippingDocumentType,
  });

  if (response.success === false) {
    throw new Error(response.errorMessage || 'Auto invoice failed.');
  }

  return response.data;
}

export async function addManualInvoiceData(payload: ERP.OrderOperationPayload) {
  return autoInvoiceOrder(payload);

  const response = await requestWithFallback<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/erp/orders/local-fallback/invoice-add',
    'POST',
    () =>
      Promise.resolve(applyOrderOperation('invoice-add', payload)).then(() => ({
        success: true,
        data: {
          message: '已回退到本地 mock 发票补录',
        },
      })),
    payload,
  );

  if (response.success === false) {
    throw new Error(response.errorMessage || '发票补录失败');
  }

  return response.data;
}

async function postOrderAction(action: string, payload: ERP.OrderOperationPayload) {
  const endpointMap: Record<string, string> = {
    audit: 'audit',
    'reverse-audit': 'reverse-audit',
    remark: 'note',
    lock: 'lock',
    unlock: 'unlock',
    'assign-warehouse': 'assign-warehouse',
    'select-logistics': 'select-logistics',
    cancel: 'cancel',
    'after-sale': 'after-sale',
    split: 'split',
    tag: 'tags',
  };
  const endpoint = endpointMap[action];
  const targets = getOperationTargets(payload);

  if (action === 'merge') {
    return requestStrict<ERP.ApiResponse<{ affected?: number }>>(
      '/api/erp/orders/merge',
      'POST',
      payload,
    );
  }

  if (!endpoint || !targets.length) {
    return requestWithFallback<ERP.ApiResponse<{ affected: number }>>(
      `/api/erp/orders/local-fallback/${action}`,
      'POST',
      () => applyOrderOperation(action, payload),
      payload,
    );
  }

  const results = await Promise.all(
    targets.map((target) =>
      requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
        `/api/erp/orders/${target.orderSn}/${endpoint}`,
        'POST',
        {
          ...payload,
          shopId: target.shopId,
          orderSn: target.orderSn,
        },
      ),
    ),
  );

  return {
    success: results.every((result) => result.success !== false),
    data: { affected: results.length },
  };
}

async function postShopeeOrderSync<T>(
  url: string,
  payload: ERP.OrderOperationPayload & Record<string, unknown>,
  fallbackSuccessMessage: string,
) {
  return requestWithFallback<ERP.ApiResponse<T>>(
    url,
    'POST',
    () =>
      Promise.resolve(applyOrderOperation('manual-sync', payload)).then(() => ({
        success: true,
        data: {
          message: fallbackSuccessMessage,
        } as T,
      })),
    payload,
  );
}

function syncErpOrderTargets(payload: ERP.OrderOperationPayload) {
  const targets = getOperationTargets(payload);
  if (!targets.length && payload.shopId) {
    return requestStrict<API.ListResponse<ERP.OrderListItem>>(
      '/api/erp/orders',
      'GET',
      {
        shopId: payload.shopId,
        pageSize: (payload as ERP.OrderOperationPayload & { limit?: number }).limit || 50,
      },
    ).then((response) => ({
      success: response.success,
      data: { synced: response.data.length, failed: [] },
    }));
  }

  return Promise.all(
    targets.map((target) =>
      requestStrict<ERP.ApiResponse<{ jobId?: string; recordId?: string; status?: string }>>(
        `/api/erp/orders/${target.orderSn}/sync`,
        'POST',
        { shopId: target.shopId },
      ),
    ),
  ).then((results) => ({
    success: results.every((result) => result.success !== false),
    data: { synced: results.length, failed: [] },
  }));
}

export const auditOrders = (payload: ERP.OrderOperationPayload) => postOrderAction('audit', payload);
export const reverseAuditOrders = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('reverse-audit', payload);
export const updateOrderRemark = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('remark', payload);
export const updateOrderAddress = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('address/update', payload);
export const lockOrders = (payload: ERP.OrderOperationPayload) => postOrderAction('lock', payload);
export const unlockOrders = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('unlock', payload);
export const splitOrders = (payload: ERP.OrderOperationPayload) => postOrderAction('split', payload);
export const mergeOrders = (payload: ERP.OrderOperationPayload) => postOrderAction('merge', payload);
export const assignWarehouse = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('assign-warehouse', payload);
export const reassignWarehouse = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('reassign-warehouse', payload);
export const lockWarehouseOrders = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('warehouse-lock', payload);
export const unlockWarehouseOrders = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('warehouse-unlock', payload);
export const selectLogistics = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('select-logistics', payload);
export const assignLogisticsChannel = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('select-logistics', payload);
export const generateWaybill = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<{ jobId: string; labelIds: string[] }>>(
    '/api/erp/orders/labels/print-task',
    'POST',
    {
      shopId: getRequiredTarget(payload, 'generate waybill').shopId,
      orders: getOperationTargets(payload).map((target) => ({
        orderSn: target.orderSn,
        packageNumber: target.packageNumber,
        shippingDocumentType: target.shippingDocumentType,
      })),
    },
  );
export const markLogisticsAssigned = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('mark-logistics-assigned', payload);
export const rematchLogistics = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('rematch-logistics', payload);
export const arrangeShipment = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
    `/api/erp/orders/${getRequiredTarget(payload, 'arrange shipment').orderSn}/arrange-shipment`,
    'POST',
    {
      shopId: getRequiredTarget(payload, 'arrange shipment').shopId,
      packageNumber: getRequiredTarget(payload, 'arrange shipment').packageNumber,
      ...(payload.trackingNo ? { nonIntegrated: { trackingNumber: payload.trackingNo } } : {}),
      pickup: payload.pickup,
      dropoff: payload.dropoff,
      nonIntegrated: payload.nonIntegrated,
    },
  );
export const arrangeShipmentBatch = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/erp/orders/batch-arrange-shipment',
    'POST',
    {
      shopId: getRequiredTarget(payload, 'batch arrange shipment').shopId,
      orders: getOperationTargets(payload).map((target) => ({
        orderSn: target.orderSn,
        packageNumber: target.packageNumber,
      })),
    },
  );
export const arrangeShipmentMass = (payload: ERP.OrderOperationPayload) =>
  arrangeShipmentBatch(payload);
export const getShopeeShippingParameter = (params: {
  shopId?: string;
  orderId?: string;
  orderNo?: string;
  orderSn?: string;
  packageNumber?: string;
}) =>
  Promise.resolve({
    success: true,
    data: {
      shopId: params.shopId || '',
      orderNo: params.orderNo,
      orderSn: params.orderSn || params.orderNo || params.orderId || '',
      packageNumber: params.packageNumber || '',
      logisticsProfile: 'OTHER',
      shippingMode: 'unknown',
      infoNeeded: { pickup: [], dropoff: [], nonIntegrated: [] },
      canShip: Boolean(params.shopId && (params.orderSn || params.orderNo || params.orderId)),
      missingPreconditions: params.shopId ? [] : ['shopId'],
      parameterSource: 'ERP_ORDER_PROJECTION',
      checkedAt: new Date().toISOString(),
      channelStrategy: {
        profile: 'OTHER',
        packageKeyMode: 'PACKAGE_NUMBER',
        supportsSingle: true,
        supportsBatch: false,
        updateMode: 'pickup_only',
        notes: [],
        prefersMass: false,
        supportsMass: false,
      },
    },
  } as ERP.ApiResponse<ERP.ShopeeShippingParameterResult>);
export const getShopeeMassShippingParameter = (payload: ERP.OrderOperationPayload) =>
  Promise.resolve({
    success: true,
    data: {
      scope: 'ERP_ORDER_PROJECTION',
      groups: getOperationTargets(payload).map((target) => ({
        groupKey: `${target.shopId}:${target.packageNumber || target.orderSn}`,
        shopId: target.shopId,
        logisticsProfile: 'OTHER',
        successList: [{ packageNumber: target.packageNumber }],
        failList: [],
        infoNeeded: { pickup: [], dropoff: [], nonIntegrated: [] },
        canShip: true,
        missingPreconditions: [],
        parameterSource: 'ERP_ORDER_PROJECTION',
        channelStrategy: {
          profile: 'OTHER',
          packageKeyMode: 'PACKAGE_NUMBER',
          supportsSingle: true,
          supportsBatch: false,
          updateMode: 'pickup_only',
          notes: [],
          prefersMass: false,
          supportsMass: false,
        },
        checkedAt: new Date().toISOString(),
      })),
    },
  } as ERP.ApiResponse<{ scope: string; groups: ERP.ShopeeMassShippingParameterGroup[] }>);
export const syncShopeeTrackingNumber = (params: {
  shopId?: string;
  orderId?: string;
  orderNo?: string;
  orderSn?: string;
  packageNumber?: string;
  responseOptionalFields?: string;
}) =>
  requestStrict<
    ERP.ApiResponse<
      {
        scope: string;
        shopId: string;
        orderNo?: string;
        orderSn: string;
        packageNumber: string;
        trackingNumber: string;
        plpNumber: string;
        firstMileTrackingNumber: string;
        lastMileTrackingNumber: string;
        hint: string;
        pickupCode: string;
      }
    >
  >(params.shopId && (params.orderSn || params.orderNo || params.orderId)
    ? `/api/erp/orders/${params.orderSn || params.orderNo || params.orderId}/sync`
    : '/api/erp/orders/local-fallback/tracking-number',
    'POST',
    { shopId: params.shopId });
export const syncShopeeMassTrackingNumber = (payload: ERP.OrderOperationPayload) =>
  Promise.resolve({
    success: true,
    data: {
      scope: 'ERP_ORDER_SYNC',
      groups: [],
    },
  } as ERP.ApiResponse<{
    scope: string;
    groups: Array<{
      scope: string;
      shopId: string;
      logisticsChannelId?: number;
      productLocationId?: string;
      successList: ERP.ShopeeTrackingSyncItem[];
      failList: ERP.ShopeeTrackingSyncItem[];
    }>;
  }>);
export const getShopeeShippingDocumentParameter = (params: {
  shopId?: string;
  orderId?: string;
  orderNo?: string;
  orderSn?: string;
  packageNumber?: string;
}) =>
  Promise.resolve({
    success: true,
    data: {
      shopId: params.shopId || '',
      orderNo: params.orderNo,
      orderSn: params.orderSn || params.orderNo || params.orderId || '',
      packageNumber: params.packageNumber || '',
      logisticsProfile: 'OTHER',
      shippingDocumentType: 'NORMAL_AIR_WAYBILL',
      selectableShippingDocumentType: ['NORMAL_AIR_WAYBILL'],
      channelStrategy: {
        profile: 'OTHER',
        packageKeyMode: 'PACKAGE_NUMBER',
        supportsSingle: true,
        supportsBatch: false,
        updateMode: 'pickup_only',
        notes: [],
        prefersMass: false,
        supportsMass: false,
      },
      parameterSource: 'ERP_ORDER_PROJECTION',
    },
  } as ERP.ApiResponse<{
    shopId: string;
    orderNo?: string;
    orderSn: string;
    packageNumber: string;
    logisticsProfile: ERP.ShopeeChannelStrategy['profile'];
    shippingDocumentType: string;
    selectableShippingDocumentType: string[];
    channelStrategy: ERP.ShopeeChannelStrategy;
    parameterSource: string;
    raw?: Record<string, unknown>;
  }>);
export const updateShopeeShippingOrder = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
    `/api/erp/orders/${getRequiredTarget(payload, 'update shipping order').orderSn}/mark-ready-for-pickup`,
    'POST',
    {
      shopId: getRequiredTarget(payload, 'update shipping order').shopId,
      packageNumber: getRequiredTarget(payload, 'update shipping order').packageNumber,
      pickup: payload.pickup,
      dropoff: payload.dropoff,
      nonIntegrated: payload.nonIntegrated,
    },
  );
export const cancelOrders = (payload: ERP.OrderOperationPayload) => postOrderAction('cancel', payload);
export const manualSyncOrders = (payload: ERP.OrderOperationPayload) =>
  syncErpOrderTargets(payload);

const legacyManualSyncOrders = (payload: ERP.OrderOperationPayload) =>
  postShopeeOrderSync<{ synced?: number; failed?: string[] }>(
    '/api/erp/orders/local-fallback/sync-status',
    payload,
    '已回退到本地 mock 同步',
  );
export const syncOrderDetailNow = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<{ jobId?: string; recordId?: string; status?: string }>>(
    `/api/erp/orders/${payload.orderSn || payload.orderNo || payload.orderId}/sync`,
    'POST',
    { shopId: payload.shopId },
  );
export const syncShippingDocumentResultNow = (payload: ERP.OrderOperationPayload) =>
  manualSyncOrders(payload);

const legacySyncShippingDocumentResultNow = (payload: ERP.OrderOperationPayload) =>
  postShopeeOrderSync<{ synced?: number; failed?: string[] }>(
    '/api/erp/orders/local-fallback/shipping-document-result',
    payload,
    '已回退到本地 mock 面单结果同步',
  );
export const syncRecentOrderDetailsNow = (
  payload: ERP.OrderOperationPayload & { shopId?: string; days?: number; limit?: number },
) =>
  syncErpOrderTargets(payload);

const legacySyncRecentOrderDetailsNow = (
  payload: ERP.OrderOperationPayload & { shopId?: string; days?: number; limit?: number },
) =>
  postShopeeOrderSync<{ synced?: number; failedShops?: string[] }>(
    '/api/erp/orders/local-fallback/sync-recent',
    payload,
    '已回退到本地 mock 最近订单同步',
  );
export const createAfterSale = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('after-sale', payload);
export const tagOrders = (payload: ERP.OrderOperationPayload) => postOrderAction('tag', payload);
export const transferToManual = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/erp/orders/exceptions/manual-review',
    'POST',
    payload,
  );
export const recheckAbnormalOrders = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/erp/orders/exceptions/recheck',
    'POST',
    payload,
  );
export const ignoreAbnormalOrders = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/erp/orders/exceptions/ignore',
    'POST',
    payload,
  );

export function getShippingDocumentDownloadUrl(
  packageNumber?: string,
  shippingDocumentType?: string,
) {
  if (!packageNumber) {
    return '';
  }
  const query = new URLSearchParams({
    packageNumber,
    ...(shippingDocumentType ? { shippingDocumentType } : {}),
  });
  return `/api/erp/orders/labels/${encodeURIComponent(query.toString())}/download`;
}

export async function saveOrderRule(payload: ERP.RuleSavePayload) {
  const response = await requestWithFallback<ERP.ApiResponse<ERP.RuleConfigItem>>(
    '/api/rules',
    'POST',
    () => saveRule(payload),
    payload,
    true,
  );
  return response.data;
}

export async function toggleOrderRule(id: string) {
  const response = await requestWithFallback<ERP.ApiResponse<ERP.RuleConfigItem>>(
    `/api/rules/${id}/toggle`,
    'POST',
    () => toggleRule(id),
    { id },
    true,
  );
  return response.data;
}

export async function deleteOrderRule(id: string) {
  const response = await requestWithFallback<ERP.ApiResponse<{ id: string }>>(
    `/api/rules/${id}/delete`,
    'POST',
    () => deleteRule(id),
    { id },
    true,
  );
  return response.data;
}
