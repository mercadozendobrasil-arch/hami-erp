import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SHOPEE_DEFAULT_API_BASE_URL } from 'src/common/shopee.constants';
import {
  createShopeeApiSignature,
  createShopeeAuthUrlSignature,
} from 'src/common/shopee-signature.util';
import { ShopeeApiResponse, ShopeeTokenPayload } from 'src/common/shopee.types';

interface GetAccessTokenParams {
  code: string;
  shopId: bigint;
}

@Injectable()
export class AuthSdk {
  constructor(private readonly configService: ConfigService) {}

  generateAuthorizationUrl(redirect: string) {
    const timestamp = this.getTimestamp();
    const path = '/api/v2/shop/auth_partner';
    const url = new URL(`${this.getApiBaseUrl()}${path}`);

    url.searchParams.set('partner_id', this.getPartnerId().toString());
    url.searchParams.set('redirect', redirect);
    url.searchParams.set('timestamp', timestamp.toString());
    url.searchParams.set(
      'sign',
      createShopeeAuthUrlSignature(this.getPartnerId(), path, timestamp),
    );

    return {
      authorizationUrl: url.toString(),
      expiresAt: new Date((timestamp + 5 * 60) * 1000),
      timestamp,
    };
  }

  async getAccessToken(params: GetAccessTokenParams) {
    return this.postTokenRequest('/api/v2/auth/token/get', {
      code: params.code,
      partner_id: this.getPartnerId(),
      shop_id: Number(params.shopId),
    });
  }

  async refreshAccessToken(params: { shopId: bigint; refreshToken: string }) {
    return this.postTokenRequest('/api/v2/auth/access_token/get', {
      refresh_token: params.refreshToken,
      partner_id: this.getPartnerId(),
      shop_id: Number(params.shopId),
    });
  }

  private async postTokenRequest(
    path: string,
    body: Record<string, number | string>,
  ) {
    const partnerId = this.getPartnerId();
    const timestamp = this.getTimestamp();
    const sign = createShopeeApiSignature({
      partnerId,
      partnerKey: this.getPartnerKey(),
      path,
      timestamp,
      shopId:
        typeof body.shop_id === 'number' ? BigInt(body.shop_id) : undefined,
    });

    const url = new URL(`${this.getApiBaseUrl()}${path}`);
    url.searchParams.set('partner_id', partnerId.toString());
    url.searchParams.set('timestamp', timestamp.toString());
    url.searchParams.set('sign', sign);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload =
      (await response.json()) as ShopeeApiResponse<ShopeeTokenPayload>;

    if (!response.ok || payload.error || !payload.response) {
      throw new BadGatewayException(
        payload.message || payload.error || 'Shopee token request failed.',
      );
    }

    return payload.response;
  }

  private getApiBaseUrl() {
    return this.configService.get<string>(
      'SHOPEE_API_BASE_URL',
      SHOPEE_DEFAULT_API_BASE_URL,
    );
  }

  private getPartnerId() {
    return Number(this.configService.getOrThrow<string>('SHOPEE_PARTNER_ID'));
  }

  private getPartnerKey() {
    return this.configService.getOrThrow<string>('SHOPEE_PARTNER_KEY');
  }

  private getTimestamp() {
    return Math.floor(Date.now() / 1000);
  }
}
