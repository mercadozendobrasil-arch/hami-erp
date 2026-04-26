import { Injectable } from '@nestjs/common';

import { ShopeeClient } from '../shopee-client';
import { ShopeeTokenPayload } from '../sdk.types';

interface GetAccessTokenParams {
  code: string;
  shopId: bigint;
}

@Injectable()
export class AuthSdk {
  constructor(private readonly shopeeClient: ShopeeClient) {}

  generateAuthorizationUrl(redirect: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const authorizationUrl = this.shopeeClient.buildAuthorizationUrl({
      redirectUrl: redirect,
      timestamp,
    });

    return {
      authorizationUrl,
      expiresAt: new Date((timestamp + 5 * 60) * 1000),
      timestamp,
    };
  }

  async getAccessToken(
    params: GetAccessTokenParams,
  ): Promise<ShopeeTokenPayload> {
    const response = await this.shopeeClient.getAccessToken({
      code: params.code,
      shopId: params.shopId.toString(),
    });

    return response.data;
  }

  async refreshAccessToken(params: {
    shopId: bigint;
    refreshToken: string;
  }): Promise<ShopeeTokenPayload> {
    const response = await this.shopeeClient.refreshAccessToken({
      shopId: params.shopId.toString(),
      refreshToken: params.refreshToken,
    });

    return response.data;
  }
}
