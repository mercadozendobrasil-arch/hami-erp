import { Injectable } from '@nestjs/common';

import { ShopeeBusinessContext } from '../../common/shopee/shopee.types';
import { ShopeeClient } from '../shopee-client';
import { toShopeePayload } from '../shopee-payload';

export interface ShopeeShippingInfoPayload {
  logisticsChannels: Array<{
    logisticId: number;
    enabled: boolean;
    shippingFee?: number;
    sizeId?: number;
  }>;
}

@Injectable()
export class LogisticsSdk {
  constructor(private readonly shopeeClient: ShopeeClient) {}

  async getChannelList(context: ShopeeBusinessContext) {
    const response = await this.shopeeClient.request<{
      logistics_channel_list: unknown[];
    }>({
      method: 'GET',
      path: '/api/v2/logistics/get_channel_list',
      accessToken: context.accessToken,
      shopId: context.shopId,
    });

    return response.data;
  }

  async getShippingParameter(context: ShopeeBusinessContext, itemId: number) {
    const response = await this.shopeeClient.request<{
      shipping_parameter_info: unknown;
    }>({
      method: 'GET',
      path: '/api/v2/logistics/get_shipping_parameter',
      accessToken: context.accessToken,
      shopId: context.shopId,
      query: {
        item_id: itemId,
      },
    });

    return response.data;
  }

  async updateShippingInfo(
    context: ShopeeBusinessContext,
    itemId: number,
    payload: ShopeeShippingInfoPayload,
  ) {
    const response = await this.shopeeClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/api/v2/logistics/update_shipping_info',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: toShopeePayload({
        itemId,
        logisticsChannels: payload.logisticsChannels,
      }),
    });

    return response.data;
  }

  async shipOrder(
    context: ShopeeBusinessContext,
    input: {
      orderSn: string;
      packageNumber?: string;
      pickup?: Record<string, unknown>;
      dropoff?: Record<string, unknown>;
      nonIntegrated?: Record<string, unknown>;
    },
  ) {
    const response = await this.shopeeClient.request<Record<string, unknown>>({
      method: 'POST',
      path: '/api/v2/logistics/ship_order',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: toShopeePayload(input),
    });

    return response.data;
  }
}
