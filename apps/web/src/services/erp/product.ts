import { request } from '@umijs/max';

export type ProductAiTaskType =
  | 'poster_batch'
  | 'main_image_optimize'
  | 'scene_image'
  | 'detail_content_image'
  | 'full_edit'
  | 'partial_edit';

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

export async function uploadProductMedia(payload: {
  productId: string;
  tenantId?: string;
  mediaType: 'image' | 'video' | 'attachment';
  sourceType?: 'original' | 'product' | 'sku' | 'ai';
  fileUrl: string;
  thumbnailUrl?: string;
  fileName?: string;
  sortNo?: number;
  isMain?: boolean;
  createdBy?: string;
}) {
  return request('/api/product/media/upload', {
    method: 'POST',
    data: payload,
  });
}

export async function queryProductMedia(productId: string, tenantId = 'default') {
  return request(`/api/product/${productId}/media/list`, {
    method: 'GET',
    params: { tenantId },
  });
}

export async function queryProductAiAssets(productId: string, tenantId = 'default') {
  return request(`/api/product/${productId}/ai-assets`, {
    method: 'GET',
    params: { tenantId },
  });
}

export async function queryProductAiTasks(productId: string, tenantId = 'default') {
  return request(`/api/product/${productId}/ai-tasks`, {
    method: 'GET',
    params: { tenantId },
  });
}

export async function createProductAiTask(payload: {
  productId: string;
  tenantId?: string;
  taskType: ProductAiTaskType;
  sourceMediaIds: string[];
  stylePreference?: string;
  bizGoal?: string;
  extraPrompt?: string;
  totalCount?: number;
  createdBy?: string;
}) {
  return request('/api/ai/product/tasks/create', {
    method: 'POST',
    data: payload,
  });
}

export async function bindProductMediaUsage(
  productId: string,
  payload: {
    assetId: string;
    versionId: string;
    usageType:
      | 'product_main'
      | 'product_detail'
      | 'marketing_material'
      | 'channel_publish';
    usageTarget?: string;
    sortNo?: number;
    createdBy?: string;
  },
  tenantId = 'default',
) {
  return request(`/api/product/${productId}/media/usage/bind`, {
    method: 'POST',
    params: { tenantId },
    data: payload,
  });
}
