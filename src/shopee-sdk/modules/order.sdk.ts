import { Injectable } from '@nestjs/common';

import { ShopeeApiClientService } from 'src/common/shopee-api-client.service';
import {
  ShopeeApiEnvelope,
  ShopeeOrderListParams,
} from 'src/common/shopee.types';

@Injectable()
export class OrderSdk {
  constructor(
    private readonly shopeeApiClientService: ShopeeApiClientService,
  ) {}

  getOrderList(
    shopId: string,
    params: ShopeeOrderListParams,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.shopeeApiClientService.request({
      path: '/api/v2/order/get_order_list',
      method: 'GET',
      shopId,
      query: {
        time_range_field: params.timeRangeField,
        time_from: params.timeFrom,
        time_to: params.timeTo,
        page_size: params.pageSize,
        cursor: params.cursor,
        order_status: params.orderStatus,
        response_optional_fields: params.responseOptionalFields,
      },
    });
  }

  getOrderDetail(
    shopId: string,
    orderSn: string,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.shopeeApiClientService.request({
      path: '/api/v2/order/get_order_detail',
      method: 'GET',
      shopId,
      query: {
        order_sn_list: orderSn,
        response_optional_fields:
          'buyer_user_id,buyer_username,item_list,total_amount,order_status,payment_method,create_time,update_time',
      },
    });
  }

  setNote(
    shopId: string,
    orderSn: string,
    note: string,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.shopeeApiClientService.request({
      path: '/api/v2/order/set_note',
      method: 'POST',
      shopId,
      body: {
        order_sn: orderSn,
        note,
      },
    });
  }

  cancelOrder(
    shopId: string,
    orderSn: string,
    cancelReason: string,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.shopeeApiClientService.request({
      path: '/api/v2/order/cancel_order',
      method: 'POST',
      shopId,
      body: {
        order_sn: orderSn,
        cancel_reason: cancelReason,
      },
    });
  }
}
