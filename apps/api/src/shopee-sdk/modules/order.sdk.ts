import { Injectable } from '@nestjs/common';

import { ShopeeApiClientService } from 'src/common/shopee-api-client.service';
import {
  ShopeeApiEnvelope,
  ShopeeOrderListParams,
} from 'src/common/shopee.types';

export interface ShopeeShippingDocumentPackageInput {
  orderSn: string;
  packageNumber?: string;
  shippingDocumentType?: string;
}

export interface ShopeeShipOrderInput {
  orderSn: string;
  packageNumber?: string;
  pickup?: Record<string, unknown>;
  dropoff?: Record<string, unknown>;
  nonIntegrated?: Record<string, unknown>;
}

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
          'buyer_user_id,buyer_username,item_list,total_amount,currency,order_status,payment_method,create_time,update_time,package_list,shipping_carrier,checkout_shipping_carrier,recipient_address,message_to_seller',
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

  createShippingDocument(
    shopId: string,
    packages: ShopeeShippingDocumentPackageInput[],
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.shopeeApiClientService.request({
      path: '/api/v2/logistics/create_shipping_document',
      method: 'POST',
      shopId,
      body: {
        order_list: packages.map((item) => ({
          order_sn: item.orderSn,
          package_number: item.packageNumber,
          shipping_document_type: item.shippingDocumentType,
        })),
      },
    });
  }

  downloadShippingDocument(
    shopId: string,
    packages: ShopeeShippingDocumentPackageInput[],
  ): Promise<Buffer> {
    return this.shopeeApiClientService.download({
      path: '/api/v2/logistics/download_shipping_document',
      method: 'POST',
      shopId,
      body: {
        shipping_document_type: packages[0]?.shippingDocumentType,
        order_list: packages.map((item) => ({
          order_sn: item.orderSn,
          package_number: item.packageNumber,
        })),
      },
    });
  }

  shipOrder(
    shopId: string,
    input: ShopeeShipOrderInput,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.shopeeApiClientService.request({
      path: '/api/v2/logistics/ship_order',
      method: 'POST',
      shopId,
      body: {
        order_sn: input.orderSn,
        package_number: input.packageNumber,
        pickup: input.pickup,
        dropoff: input.dropoff,
        non_integrated: input.nonIntegrated,
      },
    });
  }
}
