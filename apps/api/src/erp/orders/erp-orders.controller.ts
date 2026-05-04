import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';

import {
  ErpOrderLogQueryDto,
  ErpOrderQueryDto,
  ErpOrderStatusCountQueryDto,
} from './dto/erp-order-query.dto';
import {
  ErpAutoInvoiceDto,
  ErpBatchMarkReadyForPickupDto,
  ErpBatchMarkShippedDto,
  ErpMarkReadyForPickupDto,
  ErpOrderShopActionDto,
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

  @Get('logs')
  listLogs(@Query() query: ErpOrderLogQueryDto) {
    return this.erpOrdersService.listLogs(query);
  }

  @Post('labels/print-task')
  createPrintTask(@Body() payload: ErpPrintLabelTaskDto) {
    const missingPackage = payload.orders?.find((order) => !order.packageNumber);
    if (missingPackage) {
      throw new BadRequestException(
        `Order ${missingPackage.orderSn} is missing packageNumber. Arrange shipment or sync package detail before printing.`,
      );
    }

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

  @Post('batch-arrange-shipment')
  batchArrangeShipment(@Body() payload: ErpBatchMarkReadyForPickupDto) {
    return this.erpOrdersService.batchArrangeShipment(payload);
  }

  @Post('batch-mark-ready-for-pickup')
  batchMarkReadyForPickup(@Body() payload: ErpBatchMarkReadyForPickupDto) {
    return this.erpOrdersService.batchMarkReadyForPickup(payload);
  }

  @Post('batch-mark-shipped')
  batchMarkShipped(@Body() payload: ErpBatchMarkShippedDto) {
    return this.erpOrdersService.batchMarkShipped(payload);
  }

  @Get()
  listOrders(@Query() query: ErpOrderQueryDto) {
    return this.erpOrdersService.listOrders(query);
  }

  @Get(':orderSn')
  getOrderDetail(
    @Param('orderSn') orderSn: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.erpOrdersService.getOrderDetail(orderSn, shopId);
  }

  @Post(':orderSn/sync')
  syncOrderDetail(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpOrderShopActionDto,
  ) {
    return this.erpOrdersService.syncOrderDetail(orderSn, payload);
  }

  @Post(':orderSn/auto-invoice')
  autoInvoiceOrder(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpAutoInvoiceDto,
  ) {
    return this.erpOrdersService.autoInvoiceOrder(orderSn, payload);
  }

  @Get(':orderSn/escrow')
  getEscrow(
    @Param('orderSn') orderSn: string,
    @Query() query: ErpOrderShopActionDto,
  ) {
    return this.erpOrdersService.getEscrow(orderSn, query);
  }

  @Post(':orderSn/arrange-shipment')
  arrangeShipment(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpMarkReadyForPickupDto,
  ) {
    return this.erpOrdersService.arrangeShipment(orderSn, payload);
  }

  @Post(':orderSn/mark-ready-for-pickup')
  markReadyForPickup(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpMarkReadyForPickupDto,
  ) {
    return this.erpOrdersService.markReadyForPickup(orderSn, payload);
  }
}
