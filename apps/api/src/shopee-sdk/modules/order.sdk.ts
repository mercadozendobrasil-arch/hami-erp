import { Injectable } from '@nestjs/common';

import {
  ShopeeApiEnvelope,
  ShopeeOrderListParams,
} from 'src/common/shopee.types';
import { ShopeeTokenService } from 'src/common/shopee-token.service';

import { ShopeeClient } from '../shopee-client';
import { toShopeePayload } from '../shopee-payload';

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
    private readonly shopeeClient: ShopeeClient,
    private readonly tokenService: ShopeeTokenService,
  ) {}

  async getOrderList(
    shopId: string,
    params: ShopeeOrderListParams,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.requestWithStoredToken(shopId, {
      path: '/api/v2/order/get_order_list',
      method: 'GET',
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

  async getOrderDetail(
    shopId: string,
    orderSn: string,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.requestWithStoredToken(shopId, {
      path: '/api/v2/order/get_order_detail',
      method: 'GET',
      query: {
        order_sn_list: orderSn,
        response_optional_fields:
          'buyer_user_id,buyer_username,item_list,total_amount,currency,order_status,payment_method,create_time,update_time,package_list,shipping_carrier,checkout_shipping_carrier,recipient_address,message_to_seller',
      },
    });
  }

  async setNote(
    shopId: string,
    orderSn: string,
    note: string,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.requestWithStoredToken(shopId, {
      path: '/api/v2/order/set_note',
      method: 'POST',
      body: {
        order_sn: orderSn,
        note,
      },
    });
  }

  async cancelOrder(
    shopId: string,
    orderSn: string,
    cancelReason: string,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.requestWithStoredToken(shopId, {
      path: '/api/v2/order/cancel_order',
      method: 'POST',
      body: {
        order_sn: orderSn,
        cancel_reason: cancelReason,
      },
    });
  }

  async createShippingDocument(
    shopId: string,
    packages: ShopeeShippingDocumentPackageInput[],
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.requestWithStoredToken(shopId, {
      path: '/api/v2/logistics/create_shipping_document',
      method: 'POST',
      body: {
        order_list: packages.map((item) => ({
          order_sn: item.orderSn,
          package_number: item.packageNumber,
          shipping_document_type: item.shippingDocumentType,
        })),
      },
    });
  }

  async downloadShippingDocument(
    shopId: string,
    packages: ShopeeShippingDocumentPackageInput[],
  ): Promise<Buffer> {
    const { token } = await this.tokenService.findRequiredTokenByShopId(
      BigInt(shopId),
    );

    return this.shopeeClient.download({
      path: '/api/v2/logistics/download_shipping_document',
      method: 'POST',
      shopId,
      accessToken: token.accessToken,
      body: {
        shipping_document_type: packages[0]?.shippingDocumentType,
        order_list: packages.map((item) => ({
          order_sn: item.orderSn,
          package_number: item.packageNumber,
        })),
      },
      headers: {
        accept: 'application/pdf,application/octet-stream,application/json',
      },
    });
  }

  async shipOrder(
    shopId: string,
    input: ShopeeShipOrderInput,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.requestWithStoredToken(shopId, {
      path: '/api/v2/logistics/ship_order',
      method: 'POST',
      body: toShopeePayload(input),
    });
  }

  private async requestWithStoredToken(
    shopId: string,
    request: {
      path: string;
      method: 'GET' | 'POST';
      query?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      headers?: Record<string, string>;
    },
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    const { token } = await this.tokenService.findRequiredTokenByShopId(
      BigInt(shopId),
    );
    const response = await this.shopeeClient.request<Record<string, unknown>>({
      ...request,
      shopId,
      accessToken: token.accessToken,
    });

    return response.raw;
  }
}
