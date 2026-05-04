import { request } from '@umijs/max';

export async function getShopeeAuthUrl(redirectUri?: string) {
  const response = await request<
    ERP.ShopeeAuthUrlResponse & { authorizationUrl?: string; redirectUri?: string }
  >('/api/shopee/auth/authorize-url', {
    method: 'POST',
    data: redirectUri ? { redirectUri } : {},
  });

  return {
    ...response,
    url: response.url || response.authorizationUrl || '',
    redirectUrl: response.redirectUrl || response.redirectUri || '',
  };
}

export async function submitShopeeAuthCallback(payload: {
  code: string;
  shopId: string;
}) {
  return request<ERP.ApiResponse<{ shopId: string; shopName?: string }>>(
    '/api/shopee/auth/callback',
    {
      method: 'POST',
      data: payload,
    },
  );
}

export async function queryShops(params: ERP.PageParams) {
  const response = await request<API.ListResponse<ERP.ShopListItem> | ERP.ShopListItem[]>('/api/shopee/shops', {
    method: 'GET',
    params,
  });

  if (Array.isArray(response)) {
    return {
      success: true,
      data: response,
      total: response.length,
      current: params.current ?? 1,
      pageSize: params.pageSize ?? 20,
    };
  }

  return {
    ...response,
    success: response.success ?? true,
    data: response.data || [],
    total: response.total ?? response.data?.length ?? 0,
    current: response.current ?? params.current ?? 1,
    pageSize: response.pageSize ?? params.pageSize ?? 20,
  };
}

export async function syncShop(shopId: string) {
  return request<ERP.ApiResponse<ERP.ShopListItem>>(
    `/api/shopee/shops/${shopId}/sync`,
    {
      method: 'POST',
    },
  );
}

export async function refreshToken(shopId: string) {
  return request<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/shopee/auth/refresh-token',
    {
      method: 'POST',
      data: { shopId },
    },
  );
}

export const syncShopeeOrdersByShop = syncShop;
