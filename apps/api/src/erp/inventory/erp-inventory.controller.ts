import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import {
  AdjustInventoryDto,
  CreateErpWarehouseDto,
  ErpInventoryQueryDto,
  ReleaseInventoryDto,
  ReserveInventoryDto,
} from './dto/erp-inventory.dto';
import { ErpInventoryService } from './erp-inventory.service';

@Controller('erp/inventory')
export class ErpInventoryController {
  constructor(private readonly erpInventoryService: ErpInventoryService) {}

  @Get('warehouses')
  listWarehouses() {
    return this.erpInventoryService.listWarehouses();
  }

  @Post('warehouses')
  createWarehouse(@Body() payload: CreateErpWarehouseDto) {
    return this.erpInventoryService.createWarehouse(payload);
  }

  @Get('balances')
  listBalances(@Query() query: ErpInventoryQueryDto) {
    return this.erpInventoryService.listBalances(query);
  }

  @Post('adjustments')
  adjustStock(@Body() payload: AdjustInventoryDto) {
    return this.erpInventoryService.adjustStock(payload);
  }

  @Post('reservations')
  reserveStock(@Body() payload: ReserveInventoryDto) {
    return this.erpInventoryService.reserveStock(payload);
  }

  @Post('reservations/release')
  releaseReservation(@Body() payload: ReleaseInventoryDto) {
    return this.erpInventoryService.releaseReservation(payload);
  }
}
