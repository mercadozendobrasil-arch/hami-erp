export const SHOPEE_AUTH_REFRESH_QUEUE = 'shopee-auth-refresh';
export const SHOPEE_AUTH_REFRESH_JOB = 'refresh-access-token';

export const SHOPEE_DEFAULT_API_BASE_URL = 'https://partner.shopeemobile.com';
export const DEFAULT_SHOPEE_BASE_URL = SHOPEE_DEFAULT_API_BASE_URL;
export const SHOPEE_SANDBOX_BASE_URL =
  'https://openplatform.sandbox.test-stable.shopee.sg';

export const SHOPEE_ACCESS_TOKEN_TTL_SECONDS = 4 * 60 * 60;
export const SHOPEE_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const SHOPEE_REFRESH_LEEWAY_MS = 5 * 60 * 1000;

export const SHOPEE_SIGNATURE_HEADER_CANDIDATES = [
  'x-shopee-hmac-sha256',
  'x-shopee-signature',
  'authorization',
] as const;
