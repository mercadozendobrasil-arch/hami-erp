import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequireErpPermissions } from 'src/common/auth/erp-permissions.decorator';
import { ErpApiTokenGuard } from 'src/common/guards/erp-api-token.guard';

import {
  ErpOrderLogQueryDto,
  ErpOrderQueryDto,
  ErpOrderStatusCountQueryDto,
} from './dto/erp-order-query.dto';
import {
  ErpBatchMarkReadyForPickupDto,
  ErpBatchMarkShippedDto,
  ErpMarkReadyForPickupDto,
  ErpOrderShopActionDto,
  ErpPrintLabelTaskDto,
} from './dto/erp-order-action.dto';
import { ErpOrdersService } from './erp-orders.service';

@ApiTags('erp-orders')
@ApiBearerAuth()
@UseGuards(ErpApiTokenGuard)
@RequireErpPermissions('erp.read')
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
  @RequireErpPermissions('erp.write')
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

  @Post('batch-arrange-shipment')
  @RequireErpPermissions('erp.write')
  batchArrangeShipment(@Body() payload: ErpBatchMarkReadyForPickupDto) {
    return this.erpOrdersService.batchArrangeShipment(payload);
  }

  @Post('batch-mark-ready-for-pickup')
  @RequireErpPermissions('erp.write')
  batchMarkReadyForPickup(@Body() payload: ErpBatchMarkReadyForPickupDto) {
    return this.erpOrdersService.batchMarkReadyForPickup(payload);
  }

  @Post('batch-mark-shipped')
  @RequireErpPermissions('erp.write')
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
  @RequireErpPermissions('erp.write')
  syncOrderDetail(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpOrderShopActionDto,
  ) {
    return this.erpOrdersService.syncOrderDetail(orderSn, payload);
  }

  @Get(':orderSn/escrow')
  getEscrow(
    @Param('orderSn') orderSn: string,
    @Query() query: ErpOrderShopActionDto,
  ) {
    return this.erpOrdersService.getEscrow(orderSn, query);
  }

  @Post(':orderSn/arrange-shipment')
  @RequireErpPermissions('erp.write')
  arrangeShipment(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpMarkReadyForPickupDto,
  ) {
    return this.erpOrdersService.arrangeShipment(orderSn, payload);
  }

  @Post(':orderSn/mark-ready-for-pickup')
  @RequireErpPermissions('erp.write')
  markReadyForPickup(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpMarkReadyForPickupDto,
  ) {
    return this.erpOrdersService.markReadyForPickup(orderSn, payload);
  }
}
