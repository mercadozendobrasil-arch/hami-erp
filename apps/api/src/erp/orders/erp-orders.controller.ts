import { Body, Controller, Get, Header, Param, Post, Query, StreamableFile } from '@nestjs/common';

import {
  ErpOrderQueryDto,
  ErpOrderStatusCountQueryDto,
} from './dto/erp-order-query.dto';
import {
  ErpBatchMarkReadyForPickupDto,
  ErpMarkReadyForPickupDto,
  ErpPrintLabelTaskDto,
} from './dto/erp-order-action.dto';
import { ErpOrdersService } from './erp-orders.service';

@Controller('erp/orders')
export class ErpOrdersController {
  constructor(private readonly erpOrdersService: ErpOrdersService) {}

  @Get('status-counts')
  getStatusCounts(@Query() query: ErpOrderStatusCountQueryDto) {
    return this.erpOrdersService.getStatusCounts(query);
  }

  @Get()
  listOrders(@Query() query: ErpOrderQueryDto) {
    return this.erpOrdersService.listOrders(query);
  }

  @Post('labels/print-task')
  createPrintTask(@Body() payload: ErpPrintLabelTaskDto) {
    return this.erpOrdersService.createPrintTask(payload);
  }

  @Get('labels/:labelId/download')
  @Header('Content-Type', 'application/pdf')
  async downloadLabel(@Param('labelId') labelId: string) {
    const { file, filename } = await this.erpOrdersService.downloadLabel(labelId);
    return new StreamableFile(file, {
      disposition: `attachment; filename="${filename}"`,
      type: 'application/pdf',
    });
  }

  @Post('batch-mark-ready-for-pickup')
  batchMarkReadyForPickup(@Body() payload: ErpBatchMarkReadyForPickupDto) {
    return this.erpOrdersService.batchMarkReadyForPickup(payload);
  }

  @Post(':orderSn/mark-ready-for-pickup')
  markReadyForPickup(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpMarkReadyForPickupDto,
  ) {
    return this.erpOrdersService.markReadyForPickup(orderSn, payload);
  }
}
