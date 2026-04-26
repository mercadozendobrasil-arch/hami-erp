import { Injectable } from '@nestjs/common';

import { ShopeeTokenService } from 'src/common/shopee-token.service';

import { ShopeeClient } from '../shopee-client';

@Injectable()
export class PaymentSdk {
  constructor(
    private readonly shopeeClient: ShopeeClient,
    private readonly tokenService: ShopeeTokenService,
  ) {}

  async getEscrowDetail(shopId: string, orderSn: string) {
    const credentials = await this.getCredentials(shopId);
    const response = await this.shopeeClient.request<Record<string, unknown>>({
      path: '/payment/get_escrow_detail',
      method: 'GET',
      shopId: credentials.shopId,
      accessToken: credentials.accessToken,
      query: {
        order_sn: orderSn,
      },
    });

    return response.raw;
  }

  async getPayoutDetail(shopId: string, payoutId: string) {
    const credentials = await this.getCredentials(shopId);
    const response = await this.shopeeClient.request<Record<string, unknown>>({
      path: '/payment/get_payout_detail',
      method: 'GET',
      shopId: credentials.shopId,
      accessToken: credentials.accessToken,
      query: {
        payout_id: payoutId,
      },
    });

    return response.raw;
  }

  async getWalletTransactionList(
    shopId: string,
    params: {
      pageNo?: number;
      pageSize?: number;
      createTimeFrom?: number;
      createTimeTo?: number;
      transactionType?: string;
    },
  ) {
    const credentials = await this.getCredentials(shopId);
    const response = await this.shopeeClient.request<Record<string, unknown>>({
      path: '/payment/get_wallet_transaction_list',
      method: 'GET',
      shopId: credentials.shopId,
      accessToken: credentials.accessToken,
      query: {
        page_no: params.pageNo,
        page_size: params.pageSize,
        create_time_from: params.createTimeFrom,
        create_time_to: params.createTimeTo,
        transaction_type: params.transactionType,
      },
    });

    return response.raw;
  }

  private async getCredentials(shopId: string) {
    const { token } = await this.tokenService.findRequiredTokenByShopId(
      BigInt(shopId),
    );

    return {
      shopId,
      accessToken: token.accessToken,
    };
  }
}
