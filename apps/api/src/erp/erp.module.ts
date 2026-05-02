import { Module } from '@nestjs/common';

import { ErpDashboardController } from './dashboard/erp-dashboard.controller';
import { ErpDashboardService } from './dashboard/erp-dashboard.service';
import { ErpFinanceController } from './finance/erp-finance.controller';
import { ErpFinanceService } from './finance/erp-finance.service';
import { ErpFiscalController } from './fiscal/erp-fiscal.controller';
import { ErpFiscalService } from './fiscal/erp-fiscal.service';
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
import { ErpSyncLogsController } from './sync-logs/erp-sync-logs.controller';
import { ErpSyncLogsService } from './sync-logs/erp-sync-logs.service';
import { ErpSystemController } from './system/erp-system.controller';
import { ErpSystemService } from './system/erp-system.service';

@Module({
  controllers: [
    ErpDashboardController,
    ErpJobsController,
    ErpOrderActionsController,
    ErpOrdersController,
    ErpProductsController,
    ErpInventoryController,
    ErpPurchasesController,
    ErpFinanceController,
    ErpFiscalController,
    ErpSyncLogsController,
    ErpSystemController,
  ],
  providers: [
    ErpDashboardService,
    ErpJobsService,
    ErpOrderActionsService,
    ErpOrdersService,
    ErpProductsService,
    ErpInventoryService,
    ErpPurchasesService,
    ErpFinanceService,
    ErpFiscalService,
    ErpSyncLogsService,
    ErpSystemService,
  ],
})
export class ErpModule {}
