export interface ShopeeApiResponse<TResponse> {
  error?: string;
  message?: string;
  request_id?: string;
  response?: TResponse;
}

export interface ShopeeApiEnvelope<TResponse> {
  error?: string;
  message?: string;
  request_id?: string;
  response?: TResponse;
  warning?: string;
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

export interface ShopeeOrderListParams {
  timeRangeField?: string;
  timeFrom?: number;
  timeTo?: number;
  pageSize?: number;
  cursor?: string;
  orderStatus?: string;
  responseOptionalFields?: string;
}

export interface ParsedWebhookEvent {
  eventId: string | null;
  topic: string;
  shopId: string | null;
  payload: Record<string, unknown>;
}
