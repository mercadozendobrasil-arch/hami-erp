import { BadRequestException, Injectable } from '@nestjs/common';

import { ParsedWebhookEvent } from 'src/common/shopee.types';
import { ShopeeAuthService } from 'src/common/shopee-auth.service';
import { ShopeeSignatureService } from 'src/common/shopee-signature.service';

@Injectable()
export class WebhookSdk {
  constructor(
    private readonly shopeeAuthService: ShopeeAuthService,
    private readonly shopeeSignatureService: ShopeeSignatureService,
  ) {}

  verifySignature(rawBody: string, signature: string): boolean {
    return this.shopeeSignatureService.verifyWebhookSignature({
      rawBody,
      signature,
      secret: this.shopeeAuthService.getWebhookSecret(),
    });
  }

  parseEvent(payload: string | Record<string, unknown>): ParsedWebhookEvent {
    const parsedPayload =
      typeof payload === 'string'
        ? (JSON.parse(payload) as Record<string, unknown>)
        : payload;

    if (!parsedPayload || Array.isArray(parsedPayload)) {
      throw new BadRequestException('Webhook payload must be a JSON object.');
    }

    const eventId = this.pickString(parsedPayload, [
      'event_id',
      'eventId',
      'id',
    ]);
    const topic =
      this.pickString(parsedPayload, ['code', 'topic', 'type']) ?? 'unknown';
    const shopId =
      this.pickString(parsedPayload, ['shop_id', 'shopId', 'shopid']) ??
      this.pickNestedString(parsedPayload, 'data', [
        'shop_id',
        'shopId',
        'shopid',
      ]);

    return {
      eventId,
      topic,
      shopId,
      payload: parsedPayload,
    };
  }

  private pickString(
    source: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'string' && value.length > 0) {
        return value;
      }

      if (typeof value === 'number' || typeof value === 'bigint') {
        return String(value);
      }
    }

    return null;
  }

  private pickNestedString(
    source: Record<string, unknown>,
    parentKey: string,
    keys: string[],
  ): string | null {
    const nested = source[parentKey];

    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
      return null;
    }

    return this.pickString(nested as Record<string, unknown>, keys);
  }
}
