import { Module } from '@nestjs/common';

import { ErpJobsController } from './jobs/erp-jobs.controller';
import { ErpJobsService } from './jobs/erp-jobs.service';
import { ErpOrderActionsController } from './orders/erp-order-actions.controller';
import { ErpOrderActionsService } from './orders/erp-order-actions.service';
import { ErpOrdersController } from './orders/erp-orders.controller';
import { ErpOrdersService } from './orders/erp-orders.service';

@Module({
  controllers: [ErpJobsController, ErpOrderActionsController, ErpOrdersController],
  providers: [ErpJobsService, ErpOrderActionsService, ErpOrdersService],
})
export class ErpModule {}
