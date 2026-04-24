import { Module } from '@nestjs/common';

import { ShopeeCommonModule } from '../../common/shopee/shopee-common.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [ShopeeCommonModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
