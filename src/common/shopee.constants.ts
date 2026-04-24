export const DEFAULT_SHOPEE_BASE_URL = 'https://partner.shopeemobile.com';

export const SHOPEE_SIGNATURE_HEADER_CANDIDATES = [
  'x-shopee-hmac-sha256',
  'x-shopee-signature',
  'authorization',
] as const;
