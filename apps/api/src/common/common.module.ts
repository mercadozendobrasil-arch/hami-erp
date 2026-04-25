import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ShopeeEnvironmentResolver } from './shopee-environment.resolver';
import { ShopeeTokenService } from './shopee-token.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ShopeeTokenService, ShopeeEnvironmentResolver],
  exports: [ShopeeTokenService, ShopeeEnvironmentResolver],
})
export class CommonModule {}
