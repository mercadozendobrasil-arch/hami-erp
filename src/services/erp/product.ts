import { request } from '@umijs/max';

type RawProductRecord = Record<string, unknown>;

function toStringValue(value: unknown, fallback = '-') {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return fallback;
}

function toNumberValue(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeProductRecord(record: RawProductRecord): ERP.ProductListItem {
  return {
    platformProductId: toStringValue(
      record.platformProductId ?? record.productId ?? record.externalProductId,
    ),
    title: toStringValue(record.title ?? record.productName ?? record.name),
    status: toStringValue(record.status, 'UNKNOWN'),
    stock: toNumberValue(record.stock ?? record.stockQty),
    price: toStringValue(record.price ?? record.priceBrl ?? record.amount, '0'),
  };
}

export async function queryProducts(params: ERP.PageParams) {
  const response = await request<API.ListResponse<RawProductRecord>>(
    '/api/products',
    {
      method: 'GET',
      params: {
        current: params.current,
        pageSize: params.pageSize,
        shopId: params.shopId,
        title: params.title,
        status: params.status,
      },
    },
  );

  return {
    ...response,
    success: response.success ?? true,
    total: response.total ?? 0,
    data: (response.data || []).map(normalizeProductRecord),
  };
}
