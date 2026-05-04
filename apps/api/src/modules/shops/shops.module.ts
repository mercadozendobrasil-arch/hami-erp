import { Module } from '@nestjs/common';

import { ErpShopsController } from './erp-shops.controller';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  controllers: [ShopsController, ErpShopsController],
  providers: [ShopsService],
})
export class ShopsModule {}
