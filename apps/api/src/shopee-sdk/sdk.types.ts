export type ShopeeHttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export interface ShopeeApiEnvelope<T> {
  error?: string;
  message?: string;
  request_id?: string;
  response?: T;
  warning?: string;
}

export interface ShopeeApiResponse<T> {
  ok: true;
  data: T;
  statusCode: number;
  requestId: string | null;
  warning: string | null;
  headers: Record<string, string>;
  raw: ShopeeApiEnvelope<T>;
}

export interface ShopeeApiLogEntry {
  ok: boolean;
  attempt: number;
  durationMs: number;
  method: ShopeeHttpMethod;
  path: string;
  url: string;
  statusCode?: number;
  requestId?: string | null;
  errorCode?: string;
  errorMessage?: string;
}

export interface ShopeeApiLogger {
  log(entry: ShopeeApiLogEntry): Promise<void> | void;
}

export interface ShopeeRetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface ShopeeRateLimitOptions {
  minIntervalMs: number;
}

export interface ShopeeSdkConfig {
  baseUrl: string;
  environment: 'production' | 'sandbox';
  apiVersion: string;
  partnerId: number;
  partnerKey: string;
  timeoutMs: number;
  retry: ShopeeRetryOptions;
  rateLimit: ShopeeRateLimitOptions;
  fetchImpl?: typeof fetch;
}

export interface ShopeeSignatureInput {
  path: string;
  timestamp: number;
  accessToken?: string;
  shopId?: number | string;
  merchantId?: number | string;
}

export interface ShopeeAuthUrlOptions {
  redirectUrl: string;
  state?: string;
  timestamp?: number;
  path?: string;
}

export interface ShopeeTokenRequest {
  code: string;
  shopId: number | string;
  timestamp?: number;
}

export interface ShopeeTokenPayload {
  access_token: string;
  expire_in: number;
  refresh_token: string;
  request_id?: string;
  shop_id: number;
}

export interface ShopeeRefreshTokenRequest {
  refreshToken: string;
  shopId: number | string;
  timestamp?: number;
}

export type ShopeeQueryValue = boolean | number | string | null | undefined;

export interface ShopeeRequestOptions<TBody = unknown> {
  path: string;
  method?: ShopeeHttpMethod;
  query?: Record<string, ShopeeQueryValue>;
  body?: TBody;
  contentType?: 'application/json' | 'multipart/form-data';
  headers?: Record<string, string>;
  accessToken?: string;
  shopId?: number | string;
  merchantId?: number | string;
  timestamp?: number;
  timeoutMs?: number;
  retry?: Partial<ShopeeRetryOptions>;
  signal?: AbortSignal;
}

export interface ShopeeHttpHookContext {
  attempt: number;
  timeoutMs: number;
  request: Readonly<ShopeeRequestOptions>;
  metadata: Record<string, unknown>;
  sdkConfig: Readonly<ShopeeSdkConfig>;
}

export interface ShopeeHttpHook {
  name: string;
  handle<T>(context: ShopeeHttpHookContext, next: () => Promise<T>): Promise<T>;
}

export interface ShopeeSdkErrorShape {
  code: string;
  message: string;
  retryable: boolean;
  statusCode?: number;
  requestId?: string;
  details?: unknown;
  cause?: unknown;
}

export class ShopeeSdkError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(shape: ShopeeSdkErrorShape) {
    super(shape.message, shape.cause ? { cause: shape.cause } : undefined);
    this.name = 'ShopeeSdkError';
    this.code = shape.code;
    this.retryable = shape.retryable;
    this.statusCode = shape.statusCode;
    this.requestId = shape.requestId;
    this.details = shape.details;
  }
}

export const SHOPEE_SDK_OPTIONS = Symbol('SHOPEE_SDK_OPTIONS');
export const SHOPEE_API_LOGGER = Symbol('SHOPEE_API_LOGGER');
