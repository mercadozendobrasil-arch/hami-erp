import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class ShopeeSignatureService {
  signRequest(params: {
    partnerId: number;
    path: string;
    timestamp: number;
    partnerKey: string;
    accessToken?: string;
    shopId?: string;
  }): string {
    const baseString = [
      String(params.partnerId),
      params.path,
      String(params.timestamp),
      params.accessToken ?? '',
      params.shopId ?? '',
    ].join('');

    return createHmac('sha256', params.partnerKey)
      .update(baseString, 'utf8')
      .digest('hex');
  }

  verifyWebhookSignature(params: {
    rawBody: string;
    signature: string;
    secret: string;
  }): boolean {
    const expectedHex = createHmac('sha256', params.secret)
      .update(params.rawBody, 'utf8')
      .digest('hex');
    const expectedBase64 = createHmac('sha256', params.secret)
      .update(params.rawBody, 'utf8')
      .digest('base64');

    const normalized = this.normalizeSignature(params.signature);

    return (
      this.safeCompare(normalized, expectedHex) ||
      this.safeCompare(normalized, expectedBase64)
    );
  }

  private normalizeSignature(signature: string): string {
    return signature.trim().replace(/^sha256=/i, '');
  }

  private safeCompare(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
