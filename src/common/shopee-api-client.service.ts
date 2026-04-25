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
    const response = await this.execute(options, 'application/json');
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

  async download(options: ShopeeRequestOptions): Promise<Buffer> {
    const response = await this.execute(options, 'application/pdf,application/octet-stream,application/json');
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      throw new BadGatewayException({
        message: 'Shopee file download failed.',
        path: options.path,
        status: response.status,
      });
    }

    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as ShopeeApiEnvelope<Record<string, unknown>>;
      if (payload.error) {
        throw new BadGatewayException({
          message: payload.message ?? payload.error ?? 'Shopee file download failed.',
          requestId: payload.request_id,
          path: options.path,
        });
      }
      return Buffer.from(JSON.stringify(payload));
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async execute(
    options: ShopeeRequestOptions,
    accept: string,
  ): Promise<Response> {
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
    return fetch(url, {
      method: options.method,
      headers: {
        Accept: accept,
        'Content-Type': 'application/json',
      },
      body:
        options.method === 'POST' && options.body
          ? JSON.stringify(this.removeUndefinedDeep(options.body))
          : undefined,
    });
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

  private removeUndefinedDeep(input: unknown): unknown {
    if (Array.isArray(input)) {
      return input.map((item) => this.removeUndefinedDeep(item));
    }

    if (input && typeof input === 'object') {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, this.removeUndefinedDeep(value)]),
      );
    }

    return input;
  }
}
