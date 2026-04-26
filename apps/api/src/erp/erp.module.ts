import { Module } from '@nestjs/common';

import { ErpJobsController } from './jobs/erp-jobs.controller';
import { ErpJobsService } from './jobs/erp-jobs.service';
import { ErpOrdersController } from './orders/erp-orders.controller';
import { ErpOrdersService } from './orders/erp-orders.service';

@Module({
  controllers: [ErpJobsController, ErpOrdersController],
  providers: [ErpJobsService, ErpOrdersService],
})
export class ErpModule {}
