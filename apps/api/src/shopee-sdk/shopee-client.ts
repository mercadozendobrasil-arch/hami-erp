import { Injectable } from '@nestjs/common';

import { ShopeeHttpService } from './shopee-http.service';
import { ShopeeSignature } from './shopee-signature';
import {
  type ShopeeApiResponse,
  type ShopeeAuthUrlOptions,
  type ShopeeRefreshTokenRequest,
  type ShopeeRequestOptions,
  type ShopeeTokenPayload,
  type ShopeeTokenRequest,
} from './sdk.types';

@Injectable()
export class ShopeeClient {
  constructor(
    private readonly shopeeHttpService: ShopeeHttpService,
    private readonly shopeeSignature: ShopeeSignature,
  ) {}

  buildAuthorizationUrl(options: ShopeeAuthUrlOptions): string {
    return this.shopeeSignature.buildAuthorizationUrl(options);
  }

  async getAccessToken(
    request: ShopeeTokenRequest,
  ): Promise<ShopeeApiResponse<ShopeeTokenPayload>> {
    return this.shopeeHttpService.request<ShopeeTokenPayload>({
      path: '/auth/token/get',
      method: 'POST',
      shopId: request.shopId,
      timestamp: request.timestamp,
      body: {
        partner_id: this.shopeeSignature.getPartnerId(),
        code: request.code,
        shop_id: Number(request.shopId),
      },
    });
  }

  async refreshAccessToken(
    request: ShopeeRefreshTokenRequest,
  ): Promise<ShopeeApiResponse<ShopeeTokenPayload>> {
    return this.shopeeHttpService.request<ShopeeTokenPayload>({
      path: '/auth/access_token/get',
      method: 'POST',
      shopId: request.shopId,
      timestamp: request.timestamp,
      body: {
        partner_id: this.shopeeSignature.getPartnerId(),
        refresh_token: request.refreshToken,
        shop_id: Number(request.shopId),
      },
    });
  }

  async request<TResponse, TBody = unknown>(
    request: ShopeeRequestOptions<TBody>,
  ): Promise<ShopeeApiResponse<TResponse>> {
    return this.shopeeHttpService.request<TResponse, TBody>(request);
  }

  async download<TBody = unknown>(
    request: ShopeeRequestOptions<TBody>,
  ): Promise<Buffer> {
    return this.shopeeHttpService.download(request);
  }
}
