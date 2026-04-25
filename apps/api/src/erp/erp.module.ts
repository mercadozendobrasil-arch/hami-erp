import { Module } from '@nestjs/common';

import { ShopeeApiClientService } from 'src/common/shopee-api-client.service';
import { ShopeeAuthService } from 'src/common/shopee-auth.service';
import { ShopeeSignatureService } from 'src/common/shopee-signature.service';
import { OrderSdk } from 'src/shopee-sdk/modules/order.sdk';

import { ErpJobsController } from './jobs/erp-jobs.controller';
import { ErpJobsService } from './jobs/erp-jobs.service';
import { ErpOrdersController } from './orders/erp-orders.controller';
import { ErpOrdersService } from './orders/erp-orders.service';

@Module({
  controllers: [ErpJobsController, ErpOrdersController],
  providers: [
    ErpJobsService,
    ErpOrdersService,
    OrderSdk,
    ShopeeApiClientService,
    ShopeeAuthService,
    ShopeeSignatureService,
  ],
})
export class ErpModule {}
