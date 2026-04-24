import { Injectable } from '@nestjs/common';

import { ShopeeApiClientService } from 'src/common/shopee-api-client.service';
import { ShopeeApiEnvelope } from 'src/common/shopee.types';

@Injectable()
export class PaymentSdk {
  constructor(
    private readonly shopeeApiClientService: ShopeeApiClientService,
  ) {}

  getEscrowDetail(
    shopId: string,
    orderSn: string,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.shopeeApiClientService.request({
      path: '/api/v2/payment/get_escrow_detail',
      method: 'GET',
      shopId,
      query: {
        order_sn: orderSn,
      },
    });
  }

  getPayoutDetail(
    shopId: string,
    payoutId: string,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.shopeeApiClientService.request({
      path: '/api/v2/payment/get_payout_detail',
      method: 'GET',
      shopId,
      query: {
        payout_id: payoutId,
      },
    });
  }

  getWalletTransactionList(
    shopId: string,
    params: {
      pageNo?: number;
      pageSize?: number;
      createTimeFrom?: number;
      createTimeTo?: number;
      transactionType?: string;
    },
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    return this.shopeeApiClientService.request({
      path: '/api/v2/payment/get_wallet_transaction_list',
      method: 'GET',
      shopId,
      query: {
        page_no: params.pageNo,
        page_size: params.pageSize,
        create_time_from: params.createTimeFrom,
        create_time_to: params.createTimeTo,
        transaction_type: params.transactionType,
      },
    });
  }
}
