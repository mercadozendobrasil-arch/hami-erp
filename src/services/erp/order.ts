import { request } from '@umijs/max';
import {
  applyOrderOperation,
  deleteRule,
  mockGetOrderDetail,
  mockGetRuleDetail,
  mockQueryAbnormalOrders,
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
) {
  try {
    if (method === 'GET') {
      return await request<T>(url, { method, params });
    }
    return await request<T>(url, { method, data: params });
  } catch {
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

export async function queryOrders(params: ERP.OrderQueryParams) {
  const response = await requestWithFallback<API.ListResponse<RawOrderRecord>>(
    '/api/orders',
    'GET',
    () => mockQueryOrders(params),
    params,
  );
  const hasBackendShape = response.data?.some(
    (item) =>
      typeof item === 'object' &&
      item &&
      ('createdAtRemote' in item || 'order_sn' in item || 'rawJson' in item),
  );
  return hasBackendShape
    ? normalizeBackendOrderListResponse(response)
    : normalizeOrderListResponse(response as API.ListResponse<ERP.OrderListItem>);
}

export async function queryAbnormalOrders(params: ERP.OrderQueryParams) {
  const response = await requestWithFallback<API.ListResponse<ERP.OrderListItem>>(
    '/api/abnormal-orders',
    'GET',
    () => mockQueryAbnormalOrders(params),
    params,
  );
  return normalizeOrderListResponse(response);
}

export async function queryLogisticsOrders(params: ERP.OrderQueryParams) {
  const response = await requestWithFallback<API.ListResponse<RawOrderRecord>>(
    '/api/orders/packages/logistics',
    'GET',
    () => mockQueryLogisticsOrders(params),
    params,
  );
  const hasBackendShape = response.data?.some(
    (item) =>
      typeof item === 'object' &&
      item &&
      ('order_status' in item || 'package_list' in item || 'sync_meta' in item),
  );
  return hasBackendShape
    ? normalizeBackendOrderListResponse(response)
    : normalizeOrderListResponse(response as API.ListResponse<ERP.OrderListItem>);
}

export async function queryPackagePrecheck(params: ERP.PackagePrecheckQueryParams) {
  const response = await requestStrict<API.ListResponse<ERP.PackagePrecheckItem>>(
    '/api/orders/packages/precheck',
    'GET',
    params as Record<string, unknown>,
  );
  return normalizeListResponse(response);
}

export async function queryWarehouseOrders(params: ERP.OrderQueryParams) {
  const response = await requestWithFallback<API.ListResponse<ERP.OrderListItem>>(
    '/api/warehouse-orders',
    'GET',
    () => mockQueryWarehouseOrders(params),
    params,
  );
  return normalizeOrderListResponse(response);
}

export async function getOrderDetail(id: string) {
  const response = await requestWithFallback<ERP.ApiResponse<ERP.OrderDetail | RawOrderRecord>>(
    `/api/orders/${id}`,
    'GET',
    () => ({ success: true, data: mockGetOrderDetail(id) }),
  );
  return isNormalizedOrderDetail(response.data)
    ? ensureOrderPlatformProfile(response.data)
    : normalizeBackendOrderDetail(response.data as RawOrderRecord);
}

export async function queryAfterSales(params: ERP.OrderQueryParams) {
  const response = await requestWithFallback<API.ListResponse<ERP.AfterSaleItem>>(
    '/api/after-sales',
    'GET',
    () => mockQueryAfterSales(params),
    params,
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
    '/api/logs',
    'GET',
    () => mockQueryLogs(params),
    params,
  );
  return normalizeListResponse(response);
}

export async function queryShopeeSyncLogs(params: ERP.ShopeeSyncLogQueryParams) {
  const response = await requestWithFallback<API.ListResponse<ERP.ShopeeSyncLogItem>>(
    '/api/shopee/orders/sync/logs',
    'GET',
    () => ({
      success: true,
      data: [],
      total: 0,
      current: params.current || 1,
      pageSize: params.pageSize || 20,
    }),
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
  );
  return normalizeListResponse(response);
}

export async function getOrderRuleDetail(id: string) {
  const response = await requestWithFallback<ERP.ApiResponse<ERP.RuleConfigItem>>(
    `/api/rules/${id}`,
    'GET',
    () => ({ success: true, data: mockGetRuleDetail(id) }),
  );
  return response.data;
}

export async function getOrderOverview(currentTab?: string) {
  const response = await requestWithFallback<ERP.ApiResponse<ERP.OrderOverview>>(
    '/api/orders/overview',
    'GET',
    () => ({ success: true, data: summarizeOrders(currentTab) }),
    currentTab ? { currentTab } : undefined,
  );
  return response.data;
}

export async function addInvoiceData(payload: ERP.OrderOperationPayload) {
  const response = await requestWithFallback<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/shopee/orders/invoice/add',
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
  return requestWithFallback<ERP.ApiResponse<{ affected: number }>>(
    `/api/orders/${action}`,
    'POST',
    () => applyOrderOperation(action, payload),
    payload,
  );
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
  postOrderAction('assign-logistics-channel', payload);
export const generateWaybill = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<{ requested?: number; resultSynced?: number; failed?: string[] }>>(
    '/api/shopee/orders/shipping-document/create',
    'POST',
    payload,
  );
export const markLogisticsAssigned = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('mark-logistics-assigned', payload);
export const rematchLogistics = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('rematch-logistics', payload);
export const arrangeShipment = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
    payload.orderIds && payload.orderIds.length > 1
      ? '/api/shopee/orders/ship/batch'
      : '/api/shopee/orders/ship',
    'POST',
    payload,
  );
export const arrangeShipmentBatch = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/shopee/orders/ship/batch',
    'POST',
    payload,
  );
export const arrangeShipmentMass = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/shopee/orders/ship/mass',
    'POST',
    payload,
  );
export const getShopeeShippingParameter = (params: {
  shopId?: string;
  orderId?: string;
  orderNo?: string;
  orderSn?: string;
  packageNumber?: string;
}) =>
  requestStrict<ERP.ApiResponse<ERP.ShopeeShippingParameterResult>>(
    '/api/shopee/orders/shipping-parameter',
    'GET',
    params,
  );
export const getShopeeMassShippingParameter = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<{ scope: string; groups: ERP.ShopeeMassShippingParameterGroup[] }>>(
    '/api/shopee/orders/shipping-parameter/mass',
    'POST',
    payload,
  );
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
  >('/api/shopee/orders/tracking-number', 'GET', params);
export const syncShopeeMassTrackingNumber = (payload: ERP.OrderOperationPayload) =>
  requestStrict<
    ERP.ApiResponse<
      {
        scope: string;
        groups: Array<{
          scope: string;
          shopId: string;
          logisticsChannelId?: number;
          productLocationId?: string;
          successList: ERP.ShopeeTrackingSyncItem[];
          failList: ERP.ShopeeTrackingSyncItem[];
        }>;
      }
    >
  >('/api/shopee/orders/tracking-number/mass', 'POST', payload);
export const getShopeeShippingDocumentParameter = (params: {
  shopId?: string;
  orderId?: string;
  orderNo?: string;
  orderSn?: string;
  packageNumber?: string;
}) =>
  requestStrict<
    ERP.ApiResponse<{
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
    }>
  >('/api/shopee/orders/shipping-document/parameter', 'GET', params);
export const updateShopeeShippingOrder = (payload: ERP.OrderOperationPayload) =>
  requestStrict<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/shopee/orders/shipping/update',
    'POST',
    payload,
  );
export const cancelOrders = (payload: ERP.OrderOperationPayload) => postOrderAction('cancel', payload);
export const manualSyncOrders = (payload: ERP.OrderOperationPayload) =>
  postShopeeOrderSync<{ synced?: number; failed?: string[] }>(
    '/api/shopee/orders/sync/status',
    payload,
    '已回退到本地 mock 同步',
  );
export const syncOrderDetailNow = (payload: ERP.OrderOperationPayload) =>
  postShopeeOrderSync<{ synced?: number; failed?: string[] }>(
    '/api/shopee/orders/sync/detail',
    payload,
    '已回退到本地 mock 详情同步',
  );
export const syncShippingDocumentResultNow = (payload: ERP.OrderOperationPayload) =>
  postShopeeOrderSync<{ synced?: number; failed?: string[] }>(
    '/api/shopee/orders/shipping-document/result',
    payload,
    '已回退到本地 mock 面单结果同步',
  );
export const syncRecentOrderDetailsNow = (
  payload: ERP.OrderOperationPayload & { shopId?: string; days?: number; limit?: number },
) =>
  postShopeeOrderSync<{ synced?: number; failedShops?: string[] }>(
    '/api/shopee/orders/sync/recent',
    payload,
    '已回退到本地 mock 最近订单同步',
  );
export const createAfterSale = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('after-sale', payload);
export const tagOrders = (payload: ERP.OrderOperationPayload) => postOrderAction('tag', payload);
export const transferToManual = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('manual-review', payload);
export const recheckAbnormalOrders = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('recheck', payload);
export const ignoreAbnormalOrders = (payload: ERP.OrderOperationPayload) =>
  postOrderAction('ignore-abnormal', payload);

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
  return `/api/shopee/orders/shipping-document/download?${query.toString()}`;
}

export async function saveOrderRule(payload: ERP.RuleSavePayload) {
  const response = await requestWithFallback<ERP.ApiResponse<ERP.RuleConfigItem>>(
    '/api/rules',
    'POST',
    () => saveRule(payload),
    payload,
  );
  return response.data;
}

export async function toggleOrderRule(id: string) {
  const response = await requestWithFallback<ERP.ApiResponse<ERP.RuleConfigItem>>(
    `/api/rules/${id}/toggle`,
    'POST',
    () => toggleRule(id),
    { id },
  );
  return response.data;
}

export async function deleteOrderRule(id: string) {
  const response = await requestWithFallback<ERP.ApiResponse<{ id: string }>>(
    `/api/rules/${id}/delete`,
    'POST',
    () => deleteRule(id),
    { id },
  );
  return response.data;
}
