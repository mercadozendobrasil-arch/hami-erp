import { Controller, Get, Param, Post, Query } from '@nestjs/common';

import { PaymentsService } from 'src/modules/payments/payments.service';

import { OrderListQueryDto } from './dto/order-list-query.dto';
import { OrdersService } from './orders.service';

@Controller('shopee/shops/:shopId/orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  getOrderList(
    @Param('shopId') shopId: string,
    @Query() query: OrderListQueryDto,
  ) {
    return this.ordersService.getOrderList(shopId, query);
  }

  @Get(':orderSn')
  getOrderDetail(
    @Param('shopId') shopId: string,
    @Param('orderSn') orderSn: string,
  ) {
    return this.ordersService.getOrderDetail(shopId, orderSn);
  }

  @Post(':orderSn/sync')
  syncOrder(
    @Param('shopId') shopId: string,
    @Param('orderSn') orderSn: string,
  ) {
    return this.ordersService.syncOrder(shopId, orderSn);
  }

  @Get(':orderSn/escrow')
  getEscrowDetail(
    @Param('shopId') shopId: string,
    @Param('orderSn') orderSn: string,
  ) {
    return this.paymentsService.getEscrowDetail(shopId, orderSn);
  }
}
