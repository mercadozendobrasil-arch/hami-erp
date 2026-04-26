import { Injectable } from '@nestjs/common';

import { ShopeeProfileInfo, ShopeeShopInfo } from 'src/common/shopee.types';

import { ShopeeClient } from '../shopee-client';

interface ShopRequestParams {
  accessToken: string;
  shopId: bigint;
}

@Injectable()
export class ShopSdk {
  constructor(private readonly shopeeClient: ShopeeClient) {}

  async getShopInfo(params: ShopRequestParams): Promise<ShopeeShopInfo> {
    const response = await this.shopeeClient.request<ShopeeShopInfo>({
      path: '/shop/get_shop_info',
      method: 'GET',
      accessToken: params.accessToken,
      shopId: params.shopId.toString(),
    });

    return response.data;
  }

  async getProfile(params: ShopRequestParams): Promise<ShopeeProfileInfo> {
    const response = await this.shopeeClient.request<ShopeeProfileInfo>({
      path: '/shop/get_profile',
      method: 'GET',
      accessToken: params.accessToken,
      shopId: params.shopId.toString(),
    });

    return response.data;
  }

  async updateProfile(
    params: ShopRequestParams,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await this.shopeeClient.request<Record<string, unknown>>({
      path: '/shop/update_profile',
      method: 'POST',
      accessToken: params.accessToken,
      shopId: params.shopId.toString(),
      body: payload,
    });

    return response.data;
  }
}
