import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { ShopsService } from './shops.service';

@Controller('api/shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  findMany(@Query() query: PageQueryDto) {
    return this.shopsService.findMany(query);
  }

  @Post(':shopId/sync')
  sync(@Param('shopId') shopId: string) {
    return this.shopsService.sync(shopId);
  }

  @Post(':shopId/sync/products')
  syncProducts(@Param('shopId') shopId: string) {
    return this.shopsService.syncProducts(shopId);
  }

  @Post(':shopId/sync/orders')
  syncOrders(@Param('shopId') shopId: string) {
    return this.shopsService.syncOrders(shopId);
  }
}
