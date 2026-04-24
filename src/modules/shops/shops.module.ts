import { Module } from '@nestjs/common';

import { ShopSdk } from 'src/shopee-sdk/modules/shop.sdk';

import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  controllers: [ShopsController],
  providers: [ShopsService, ShopSdk],
})
export class ShopsModule {}
