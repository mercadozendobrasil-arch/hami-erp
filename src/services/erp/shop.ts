import { request } from '@umijs/max';

type RawShopRecord = Record<string, unknown>;

function toStringValue(value: unknown, fallback = '-') {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return fallback;
}

function normalizeShopRecord(record: RawShopRecord): ERP.ShopListItem {
  return {
    shopId: toStringValue(record.shopId ?? record.id ?? record.externalShopId),
    shopName: toStringValue(record.shopName ?? record.name),
    siteCode: toStringValue(record.siteCode ?? record.region ?? record.site),
    channel: toStringValue(record.channel, 'SHOPEE'),
    status: toStringValue(record.status, 'UNKNOWN'),
    tokenExpireAt:
      typeof record.tokenExpireAt === 'string' ? record.tokenExpireAt : null,
    productCount:
      typeof record.productCount === 'number' ? record.productCount : 0,
    orderCount:
      typeof record.orderCount === 'number' ? record.orderCount : 0,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  };
}

export async function getShopeeAuthUrl() {
  return request<ERP.ShopeeAuthUrlResponse>('/api/shopee/auth/url', {
    method: 'GET',
  });
}

export async function queryShops(params: ERP.PageParams) {
  const response = await request<API.ListResponse<RawShopRecord>>('/api/shops', {
    method: 'GET',
    params: {
      current: params.current,
      pageSize: params.pageSize,
      shopId: params.shopId,
      status: params.status,
    },
  });

  return {
    ...response,
    success: response.success ?? true,
    total: response.total ?? 0,
    data: (response.data || []).map(normalizeShopRecord),
  };
}

export async function syncShopeeOrdersByShop(shopId: string) {
  return request<ERP.ShopSyncResult>(`/api/shops/${shopId}/sync/orders`, {
    method: 'POST',
  });
}
