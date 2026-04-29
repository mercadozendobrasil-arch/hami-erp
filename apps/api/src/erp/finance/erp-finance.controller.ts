import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { ErpFinanceService } from './erp-finance.service';
import { ErpFinanceQueryDto, RebuildErpFinanceDto } from './dto/erp-finance.dto';

@Controller('erp/finance')
export class ErpFinanceController {
  constructor(private readonly erpFinanceService: ErpFinanceService) {}

  @Get('order-profits')
  listOrderProfits(@Query() query: ErpFinanceQueryDto) {
    return this.erpFinanceService.listOrderProfits(query);
  }

  @Get('summary')
  getSummary(@Query() query: ErpFinanceQueryDto) {
    return this.erpFinanceService.getSummary(query);
  }

  @Post('order-profits/rebuild')
  rebuildOrderProfits(@Body() payload: RebuildErpFinanceDto) {
    return this.erpFinanceService.rebuildOrderProfits(payload);
  }
}
