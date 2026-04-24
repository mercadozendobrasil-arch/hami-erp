import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { OrdersService } from './orders.service';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findMany(
    @Query() query: PageQueryDto,
    @Query('shopId') shopId?: string,
    @Query('orderNo') orderNo?: string,
    @Query('packageNumber') packageNumber?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('currentTab') currentTab?: string,
  ) {
    return this.ordersService.findMany({
      ...query,
      shopId,
      orderNo,
      packageNumber,
      orderStatus,
      currentTab,
    });
  }

  @Get('overview')
  getOverview(
    @Query('shopId') shopId?: string,
    @Query('currentTab') currentTab?: string,
  ) {
    return this.ordersService.getOverview({
      shopId,
      currentTab,
    });
  }

  @Get('packages/logistics')
  findLogisticsMany(
    @Query() query: PageQueryDto,
    @Query('shopId') shopId?: string,
    @Query('orderNo') orderNo?: string,
    @Query('packageNumber') packageNumber?: string,
    @Query('logisticsChannel') logisticsChannel?: string,
    @Query('logisticsStatus') logisticsStatus?: string,
    @Query('shippingDocumentStatus') shippingDocumentStatus?: string,
  ) {
    return this.ordersService.findLogisticsMany({
      ...query,
      shopId,
      orderNo,
      packageNumber,
      logisticsChannel,
      logisticsStatus,
      shippingDocumentStatus,
    });
  }

  @Get('packages/precheck')
  findPackagePrecheckMany(
    @Query() query: PageQueryDto,
    @Query('shopId') shopId?: string,
    @Query('orderNo') orderNo?: string,
    @Query('orderSn') orderSn?: string,
    @Query('packageNumber') packageNumber?: string,
    @Query('logisticsProfile') logisticsProfile?: string,
    @Query('logisticsChannelId') logisticsChannelId?: string,
    @Query('logisticsChannelName') logisticsChannelName?: string,
    @Query('shippingCarrier') shippingCarrier?: string,
    @Query('packageStatus') packageStatus?: string,
    @Query('logisticsStatus') logisticsStatus?: string,
    @Query('shippingDocumentStatus') shippingDocumentStatus?: string,
    @Query('canShip') canShip?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('timeField') timeField?: string,
  ) {
    return this.ordersService.findPackagePrecheckMany({
      ...query,
      shopId,
      orderNo,
      orderSn,
      packageNumber,
      logisticsProfile,
      logisticsChannelId,
      logisticsChannelName,
      shippingCarrier,
      packageStatus,
      logisticsStatus,
      shippingDocumentStatus,
      canShip,
      startTime,
      endTime,
      timeField,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post('audit')
  audit(
    @Body()
    body: {
      orderId?: string;
      orderIds?: string[];
      orderNo?: string;
      orderNos?: string[];
      orderSn?: string;
      shopId?: string;
    },
  ) {
    return this.ordersService.auditOrders(body);
  }

  @Post('reverse-audit')
  reverseAudit(
    @Body()
    body: {
      orderId?: string;
      orderIds?: string[];
      orderNo?: string;
      orderNos?: string[];
      orderSn?: string;
      shopId?: string;
    },
  ) {
    return this.ordersService.reverseAuditOrders(body);
  }
}
