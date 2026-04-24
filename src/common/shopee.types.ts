export interface ShopeeApiResponse<TResponse> {
  error?: string;
  message?: string;
  request_id?: string;
  response?: TResponse;
}

export interface ShopeeTokenPayload {
  access_token: string;
  refresh_token: string;
  expire_in: number;
}

export interface ShopeeShopInfo {
  shop_id?: number | string;
  shop_name?: string;
  region?: string;
  status?: string;
  sip_affi_shops?: unknown[];
}

export interface ShopeeProfileInfo {
  shop_logo?: string;
  description?: string;
  shop_name?: string;
  region?: string;
}

export interface ShopeeTokenStorageInput {
  shopId: bigint;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  region?: string | null;
  shopName?: string | null;
}
