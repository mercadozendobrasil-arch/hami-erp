import { request } from '@umijs/max';

export async function queryProducts(params: ERP.PageParams) {
  return request<API.ListResponse<ERP.ProductListItem>>('/api/erp/products', {
    method: 'GET',
    params,
  });
}

export async function createErpProduct(payload: ERP.ProductSavePayload) {
  return request<ERP.ApiResponse<ERP.ProductListItem>>('/api/erp/products', {
    method: 'POST',
    data: payload,
  });
}

export async function updateOnlineProduct(
  productId: string,
  payload: ERP.ProductOnlineUpdatePayload,
) {
  return request<ERP.ApiResponse<ERP.ProductListItem>>(
    `/api/erp/products/${productId}/online`,
    {
      method: 'PATCH',
      data: payload,
    },
  );
}

export async function queryMissingSkuMappings(params: ERP.SkuMappingQueryParams) {
  return request<API.ListResponse<ERP.MissingSkuMappingItem>>(
    '/api/erp/products/sku-mappings/missing',
    {
      method: 'GET',
      params,
    },
  );
}

export async function bindSkuMapping(payload: ERP.BindSkuMappingPayload) {
  return request<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/erp/products/sku-mappings/bind',
    {
      method: 'POST',
      data: payload,
    },
  );
}

export async function queryErpSkus(params: ERP.ErpSkuQueryParams) {
  return request<API.ListResponse<ERP.ErpSkuListItem>>(
    '/api/erp/products/skus',
    {
      method: 'GET',
      params,
    },
  );
}

export async function getProductDetail(itemId: string, shopId: string) {
  return request<ERP.ApiResponse<ERP.ProductListItem>>(
    `/api/erp/products/${itemId}`,
    {
      method: 'GET',
      params: { shopId },
    },
  );
}

export async function syncProduct(itemId: string, shopId: string) {
  return request<ERP.ApiResponse<Record<string, unknown>>>(
    `/api/erp/products/${itemId}/sync`,
    {
      method: 'POST',
      params: { shopId },
    },
  );
}

export async function syncRemoteProducts(shopId: string) {
  return request<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/erp/products/sync-remote',
    {
      method: 'POST',
      params: { shopId },
    },
  );
}

export async function unlistProduct(itemId: string, shopId: string) {
  return request<ERP.ApiResponse<Record<string, unknown>>>(
    `/api/erp/products/${itemId}/unlist`,
    {
      method: 'POST',
      params: { shopId },
    },
  );
}

export async function relistProduct(itemId: string, shopId: string) {
  return request<ERP.ApiResponse<Record<string, unknown>>>(
    `/api/erp/products/${itemId}/relist`,
    {
      method: 'POST',
      params: { shopId },
    },
  );
}
