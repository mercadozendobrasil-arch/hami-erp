import { Controller, Get } from '@nestjs/common';

import { ErpDashboardService } from './erp-dashboard.service';

@Controller('erp/dashboard')
export class ErpDashboardController {
  constructor(private readonly erpDashboardService: ErpDashboardService) {}

  @Get('summary')
  getSummary() {
    return this.erpDashboardService.getSummary();
  }
}
