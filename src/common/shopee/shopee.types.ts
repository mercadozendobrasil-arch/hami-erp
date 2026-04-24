export interface ShopeeApiEnvelope<T> {
  error?: string;
  message?: string;
  request_id?: string;
  response?: T;
  warning?: string;
}

export interface ShopeeRequestOptions<TBody = unknown> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  accessToken?: string;
  shopId?: number;
  query?: Record<string, string | number | boolean | undefined>;
  body?: TBody;
  contentType?: 'application/json' | 'multipart/form-data';
}

export interface ShopeeBusinessContext {
  accessToken: string;
  shopId: number;
}

export interface ShopeePaginationQuery {
  offset?: number;
  pageSize?: number;
}
