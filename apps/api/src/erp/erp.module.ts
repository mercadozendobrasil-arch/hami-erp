import { Module } from '@nestjs/common';

import { ErpFinanceController } from './finance/erp-finance.controller';
import { ErpFinanceService } from './finance/erp-finance.service';
import { ErpInventoryController } from './inventory/erp-inventory.controller';
import { ErpInventoryService } from './inventory/erp-inventory.service';
import { ErpJobsController } from './jobs/erp-jobs.controller';
import { ErpJobsService } from './jobs/erp-jobs.service';
import { ErpOrderActionsController } from './orders/erp-order-actions.controller';
import { ErpOrderActionsService } from './orders/erp-order-actions.service';
import { ErpOrdersController } from './orders/erp-orders.controller';
import { ErpOrdersService } from './orders/erp-orders.service';
import { ErpProductsController } from './products/erp-products.controller';
import { ErpProductsService } from './products/erp-products.service';
import { ErpPurchasesController } from './purchases/erp-purchases.controller';
import { ErpPurchasesService } from './purchases/erp-purchases.service';
import { ErpSystemController } from './system/erp-system.controller';
import { ErpSystemService } from './system/erp-system.service';

@Module({
  controllers: [
    ErpJobsController,
    ErpOrderActionsController,
    ErpOrdersController,
    ErpProductsController,
    ErpInventoryController,
    ErpPurchasesController,
    ErpFinanceController,
    ErpSystemController,
  ],
  providers: [
    ErpJobsService,
    ErpOrderActionsService,
    ErpOrdersService,
    ErpProductsService,
    ErpInventoryService,
    ErpPurchasesService,
    ErpFinanceService,
    ErpSystemService,
  ],
})
export class ErpModule {}
