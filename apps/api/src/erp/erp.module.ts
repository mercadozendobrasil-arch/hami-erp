import { Module } from '@nestjs/common';

import { CommonModule } from 'src/common/common.module';

import { ErpJobsController } from './jobs/erp-jobs.controller';
import { ErpJobsService } from './jobs/erp-jobs.service';
import { ErpOrderActionsController } from './orders/erp-order-actions.controller';
import { ErpOrderActionsService } from './orders/erp-order-actions.service';
import { ErpOrdersController } from './orders/erp-orders.controller';
import { ErpOrdersService } from './orders/erp-orders.service';

@Module({
  imports: [CommonModule],
  controllers: [ErpJobsController, ErpOrderActionsController, ErpOrdersController],
  providers: [ErpJobsService, ErpOrderActionsService, ErpOrdersService],
})
export class ErpModule {}
