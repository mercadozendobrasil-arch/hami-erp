import { BadGatewayException, Injectable } from '@nestjs/common';

import { ShopeeApiEnvelope } from './shopee.types';
import { ShopeeAuthService } from './shopee-auth.service';
import { ShopeeSignatureService } from './shopee-signature.service';

interface ShopeeRequestOptions {
  path: string;
  method: 'GET' | 'POST';
  shopId: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

@Injectable()
export class ShopeeApiClientService {
  constructor(
    private readonly shopeeAuthService: ShopeeAuthService,
    private readonly shopeeSignatureService: ShopeeSignatureService,
  ) {}

  async request<TResponse>(
    options: ShopeeRequestOptions,
  ): Promise<ShopeeApiEnvelope<TResponse>> {
    const partnerId = this.shopeeAuthService.getPartnerId();
    const partnerKey = this.shopeeAuthService.getPartnerKey();
    const credentials = await this.shopeeAuthService.getShopCredentials(
      options.shopId,
    );
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.shopeeSignatureService.signRequest({
      partnerId,
      path: options.path,
      timestamp,
      partnerKey,
      accessToken: credentials.accessToken,
      shopId: credentials.shopId,
    });

    const query = this.toSearchParams({
      partner_id: partnerId,
      timestamp,
      access_token: credentials.accessToken,
      shop_id: credentials.shopId,
      sign,
      ...options.query,
    });

    const url = `${this.shopeeAuthService.getBaseUrl()}${options.path}?${query.toString()}`;
    const response = await fetch(url, {
      method: options.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body:
        options.method === 'POST' && options.body
          ? JSON.stringify(this.removeUndefined(options.body))
          : undefined,
    });

    const payload = (await response.json()) as ShopeeApiEnvelope<TResponse>;

    if (!response.ok || payload.error) {
      throw new BadGatewayException({
        message:
          payload.message ?? payload.error ?? 'Shopee API request failed.',
        requestId: payload.request_id,
        path: options.path,
      });
    }

    return payload;
  }

  private toSearchParams(input: Record<string, unknown>): URLSearchParams {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(this.removeUndefined(input))) {
      if (Array.isArray(value)) {
        searchParams.set(key, value.join(','));
        continue;
      }

      searchParams.set(key, String(value));
    }

    return searchParams;
  }

  private removeUndefined<T extends Record<string, unknown>>(input: T): T {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as T;
  }
}
