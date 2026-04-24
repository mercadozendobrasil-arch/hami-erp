import { Injectable } from '@nestjs/common';

import { ShopeeBusinessContext } from '../../common/shopee/shopee.types';
import { ShopeeHttpClient } from '../../common/shopee/shopee-http.client';

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
  constructor(private readonly shopeeHttpClient: ShopeeHttpClient) {}

  getChannelList(context: ShopeeBusinessContext) {
    return this.shopeeHttpClient.request<{ logistics_channel_list: unknown[] }>(
      {
        method: 'GET',
        path: '/logistics/get_channel_list',
        accessToken: context.accessToken,
        shopId: context.shopId,
      },
    );
  }

  getShippingParameter(context: ShopeeBusinessContext, itemId: number) {
    return this.shopeeHttpClient.request<{ shipping_parameter_info: unknown }>({
      method: 'GET',
      path: '/logistics/get_shipping_parameter',
      accessToken: context.accessToken,
      shopId: context.shopId,
      query: {
        item_id: itemId,
      },
    });
  }

  updateShippingInfo(
    context: ShopeeBusinessContext,
    itemId: number,
    payload: ShopeeShippingInfoPayload,
  ) {
    return this.shopeeHttpClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/logistics/update_shipping_info',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: {
        item_id: itemId,
        logistics_channels: payload.logisticsChannels,
      },
    });
  }
}
