import { request } from '@umijs/max';

export async function getShopeeAuthUrl() {
  const response = await request<
    ERP.ShopeeAuthUrlResponse & { authorizationUrl?: string; redirectUri?: string }
  >('/api/shopee/auth/authorize-url', {
    method: 'POST',
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
  return request<API.ListResponse<ERP.ShopListItem>>('/api/shopee/shops', {
    method: 'GET',
    params,
  });
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
