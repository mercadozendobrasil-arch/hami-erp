import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import {
  ShopDetailResponseDto,
  ShopResponseDto,
} from './dto/shop-response.dto';
import { ShopsService } from './shops.service';

@ApiTags('shopee-shops')
@Controller('shopee/shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  @ApiOkResponse({
    type: ShopResponseDto,
    isArray: true,
  })
  listShops() {
    return this.shopsService.listShops();
  }

  @Get(':shopId')
  @ApiOkResponse({
    type: ShopDetailResponseDto,
  })
  getShop(@Param('shopId') shopId: string) {
    return this.shopsService.getShop(shopId);
  }

  @Post(':shopId/sync')
  @ApiOkResponse({
    type: ShopDetailResponseDto,
  })
  syncShop(@Param('shopId') shopId: string) {
    return this.shopsService.syncShop(shopId);
  }
}
