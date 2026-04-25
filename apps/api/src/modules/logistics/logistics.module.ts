import { Module } from '@nestjs/common';

import { ShopeeCommonModule } from '../../common/shopee/shopee-common.module';
import { LogisticsController } from './logistics.controller';
import { LogisticsService } from './logistics.service';

@Module({
  imports: [ShopeeCommonModule],
  controllers: [LogisticsController],
  providers: [LogisticsService],
})
export class LogisticsModule {}
