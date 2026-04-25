import { Module } from '@nestjs/common';

import { ShopeeApiClientService } from 'src/common/shopee-api-client.service';
import { ShopeeAuthService } from 'src/common/shopee-auth.service';
import { ShopeeSignatureService } from 'src/common/shopee-signature.service';
import { PaymentSdk } from 'src/shopee-sdk/modules/payment.sdk';

import { PaymentsService } from './payments.service';

@Module({
  providers: [
    PaymentsService,
    PaymentSdk,
    ShopeeApiClientService,
    ShopeeAuthService,
    ShopeeSignatureService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
