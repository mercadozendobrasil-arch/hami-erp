import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import {
  CreateErpPurchaseOrderDto,
  CreateErpSupplierDto,
  ErpPurchaseQueryDto,
  ErpSupplierQueryDto,
  ReceiveErpPurchaseOrderDto,
} from './dto/erp-purchase.dto';
import { ErpPurchasesService } from './erp-purchases.service';

@Controller('erp/purchases')
export class ErpPurchasesController {
  constructor(private readonly erpPurchasesService: ErpPurchasesService) {}

  @Get('suppliers')
  listSuppliers(@Query() query: ErpSupplierQueryDto) {
    return this.erpPurchasesService.listSuppliers(query);
  }

  @Post('suppliers')
  createSupplier(@Body() payload: CreateErpSupplierDto) {
    return this.erpPurchasesService.createSupplier(payload);
  }

  @Get('orders')
  listPurchaseOrders(@Query() query: ErpPurchaseQueryDto) {
    return this.erpPurchasesService.listPurchaseOrders(query);
  }

  @Post('orders')
  createPurchaseOrder(@Body() payload: CreateErpPurchaseOrderDto) {
    return this.erpPurchasesService.createPurchaseOrder(payload);
  }

  @Get('orders/:orderId')
  getPurchaseOrder(@Param('orderId') orderId: string) {
    return this.erpPurchasesService.getPurchaseOrder(orderId);
  }

  @Post('orders/:orderId/receive')
  receivePurchaseOrder(
    @Param('orderId') orderId: string,
    @Body() payload: ReceiveErpPurchaseOrderDto,
  ) {
    return this.erpPurchasesService.receivePurchaseOrder(orderId, payload);
  }
}
