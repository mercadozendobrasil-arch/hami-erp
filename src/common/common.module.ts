import { Global, Module } from '@nestjs/common';

import { ShopeeTokenService } from './shopee-token.service';

@Global()
@Module({
  providers: [ShopeeTokenService],
  exports: [ShopeeTokenService],
})
export class CommonModule {}
