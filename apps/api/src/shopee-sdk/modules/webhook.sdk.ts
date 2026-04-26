import { createHmac, timingSafeEqual } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ShopeeEnvironmentResolver } from 'src/common/shopee-environment.resolver';
import { ParsedWebhookEvent } from 'src/common/shopee.types';

@Injectable()
export class WebhookSdk {
  constructor(
    private readonly configService: ConfigService,
    private readonly shopeeEnvironmentResolver: ShopeeEnvironmentResolver,
  ) {}

  verifySignature(rawBody: string, signature: string): boolean {
    const secret =
      this.configService.get<string>('SHOPEE_WEBHOOK_SECRET') ??
      this.shopeeEnvironmentResolver.getCurrentConfig().partnerKey;
    const expected = createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    return this.secureCompare(expected, signature);
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

  private secureCompare(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual);

    return (
      expectedBuffer.length === actualBuffer.length &&
      timingSafeEqual(expectedBuffer, actualBuffer)
    );
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
