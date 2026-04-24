import { createHmac } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import {
  SHOPEE_SDK_OPTIONS,
  type ShopeeAuthUrlOptions,
  type ShopeeSdkConfig,
  type ShopeeSignatureInput,
} from './sdk.types';

@Injectable()
export class ShopeeSignature {
  constructor(
    @Inject(SHOPEE_SDK_OPTIONS)
    private readonly config: ShopeeSdkConfig,
  ) {}

  signAuthorization(path: string, timestamp: number): string {
    return this.signRaw(`${this.config.partnerId}${path}${timestamp}`);
  }

  signRequest(input: ShopeeSignatureInput): string {
    const parts = [
      String(this.config.partnerId),
      input.path,
      String(input.timestamp),
    ];

    if (input.accessToken) {
      parts.push(input.accessToken);
    }

    if (input.shopId !== undefined) {
      parts.push(String(input.shopId));
    } else if (input.merchantId !== undefined) {
      parts.push(String(input.merchantId));
    }

    return this.signRaw(parts.join(''));
  }

  buildAuthorizationUrl(options: ShopeeAuthUrlOptions): string {
    const path = options.path ?? '/api/v2/shop/auth_partner';
    const timestamp = options.timestamp ?? this.getTimestamp();
    const url = new URL(path, this.config.baseUrl);

    url.searchParams.set('partner_id', String(this.config.partnerId));
    url.searchParams.set('timestamp', String(timestamp));
    url.searchParams.set('redirect', options.redirectUrl);
    url.searchParams.set('sign', this.signAuthorization(path, timestamp));

    if (options.state) {
      url.searchParams.set('state', options.state);
    }

    return url.toString();
  }

  getTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  private signRaw(payload: string): string {
    return createHmac('sha256', this.config.partnerKey)
      .update(payload, 'utf8')
      .digest('hex');
  }
}
