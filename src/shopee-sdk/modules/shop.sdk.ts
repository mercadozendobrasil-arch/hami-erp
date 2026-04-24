import { BadGatewayException, Injectable } from '@nestjs/common';

import { ShopeeEnvironmentResolver } from 'src/common/shopee-environment.resolver';
import { createShopeeApiSignature } from 'src/common/shopee-signature.util';
import {
  ShopeeApiResponse,
  ShopeeProfileInfo,
  ShopeeShopInfo,
} from 'src/common/shopee.types';

interface ShopRequestParams {
  accessToken: string;
  shopId: bigint;
}

@Injectable()
export class ShopSdk {
  constructor(
    private readonly shopeeEnvironmentResolver: ShopeeEnvironmentResolver,
  ) {}

  async getShopInfo(params: ShopRequestParams) {
    return this.getSigned<ShopeeShopInfo>('/api/v2/shop/get_shop_info', params);
  }

  async getProfile(params: ShopRequestParams) {
    return this.getSigned<ShopeeProfileInfo>(
      '/api/v2/shop/get_profile',
      params,
    );
  }

  private async getSigned<TResponse>(
    path: string,
    params: ShopRequestParams,
  ): Promise<TResponse> {
    const timestamp = Math.floor(Date.now() / 1000);
    const partnerId = this.getPartnerId();
    const url = new URL(`${this.getApiBaseUrl()}${path}`);

    url.searchParams.set('partner_id', partnerId.toString());
    url.searchParams.set('timestamp', timestamp.toString());
    url.searchParams.set('access_token', params.accessToken);
    url.searchParams.set('shop_id', params.shopId.toString());
    url.searchParams.set(
      'sign',
      createShopeeApiSignature({
        partnerId,
        partnerKey: this.getPartnerKey(),
        path,
        timestamp,
        accessToken: params.accessToken,
        shopId: params.shopId,
      }),
    );

    const response = await fetch(url);
    const payload = (await response.json()) as ShopeeApiResponse<TResponse>;

    if (!response.ok || payload.error || !payload.response) {
      throw new BadGatewayException(
        payload.message || payload.error || 'Shopee shop request failed.',
      );
    }

    return payload.response;
  }

  private getApiBaseUrl() {
    return this.shopeeEnvironmentResolver.getCurrentConfig().baseUrl;
  }

  private getPartnerId() {
    return this.shopeeEnvironmentResolver.getCurrentConfig().partnerId;
  }

  private getPartnerKey() {
    return this.shopeeEnvironmentResolver.getCurrentConfig().partnerKey;
  }
}
