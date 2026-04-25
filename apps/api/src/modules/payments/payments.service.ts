import { Injectable } from '@nestjs/common';

import { PaymentSdk } from 'src/shopee-sdk/modules/payment.sdk';

@Injectable()
export class PaymentsService {
  constructor(private readonly paymentSdk: PaymentSdk) {}

  getEscrowDetail(shopId: string, orderSn: string) {
    return this.paymentSdk.getEscrowDetail(shopId, orderSn);
  }

  getPayoutDetail(shopId: string, payoutId: string) {
    return this.paymentSdk.getPayoutDetail(shopId, payoutId);
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
  ) {
    return this.paymentSdk.getWalletTransactionList(shopId, params);
  }
}
