import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { ShopeeApiClientService } from 'src/common/shopee-api-client.service';
import { ShopeeAuthService } from 'src/common/shopee-auth.service';
import { ShopeeSignatureService } from 'src/common/shopee-signature.service';
import { ORDER_SYNC_QUEUE } from 'src/infra/queue/queue.constants';
import { PaymentsModule } from 'src/modules/payments/payments.module';
import { OrderSdk } from 'src/shopee-sdk/modules/order.sdk';

import { OrdersController } from './orders.controller';
import { OrdersSyncProcessor } from './orders-sync.processor';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: ORDER_SYNC_QUEUE,
    }),
    PaymentsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersSyncProcessor,
    OrderSdk,
    ShopeeApiClientService,
    ShopeeAuthService,
    ShopeeSignatureService,
  ],
})
export class OrdersModule {}
