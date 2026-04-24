import { createHash, createHmac } from 'node:crypto';

export function createShopeeAuthUrlSignature(
  partnerId: number,
  path: string,
  timestamp: number,
): string {
  return createHash('sha256')
    .update(`${partnerId}${path}${timestamp}`)
    .digest('hex');
}

export function createShopeeApiSignature(params: {
  partnerId: number;
  partnerKey: string;
  path: string;
  timestamp: number;
  accessToken?: string;
  shopId?: bigint;
}): string {
  const baseString = [
    params.partnerId.toString(),
    params.path,
    params.timestamp.toString(),
    params.accessToken ?? '',
    params.shopId?.toString() ?? '',
  ].join('');

  return createHmac('sha256', params.partnerKey)
    .update(baseString)
    .digest('hex');
}
