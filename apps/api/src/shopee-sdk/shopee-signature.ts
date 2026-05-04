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
    const apiPath = this.buildApiPath(path);
    return this.signRaw(`${this.config.partnerId}${apiPath}${timestamp}`);
  }

  signRequest(input: ShopeeSignatureInput): string {
    const apiPath = this.buildApiPath(input.path);
    const parts = [
      String(this.config.partnerId),
      apiPath,
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
    const path = this.buildApiPath(options.path ?? '/shop/auth_partner');
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

  getPartnerId(): number {
    return this.config.partnerId;
  }

  private signRaw(payload: string): string {
    return createHmac('sha256', this.config.partnerKey)
      .update(payload, 'utf8')
      .digest('hex');
  }

  private buildApiPath(path: string): string {
    if (path.startsWith('/api/')) {
      return path;
    }

    return `/api/${this.config.apiVersion}${path.startsWith('/') ? path : `/${path}`}`;
  }
}
