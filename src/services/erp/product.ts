import { request } from '@umijs/max';

export async function queryProducts(params: ERP.PageParams) {
  return request<API.ListResponse<ERP.ProductListItem>>('/api/erp/products', {
    method: 'GET',
    params,
  });
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
