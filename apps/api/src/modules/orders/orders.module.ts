import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { ORDER_SYNC_QUEUE } from 'src/infra/queue/queue.constants';
import { PaymentsModule } from 'src/modules/payments/payments.module';

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
  providers: [OrdersService, OrdersSyncProcessor],
})
export class OrdersModule {}
