import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { ErpApiTokenGuard } from './guards/erp-api-token.guard';
import { ShopeeEnvironmentResolver } from './shopee-environment.resolver';
import { ShopeeTokenService } from './shopee-token.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    Reflector,
    ShopeeTokenService,
    ShopeeEnvironmentResolver,
    ErpApiTokenGuard,
  ],
  exports: [ShopeeTokenService, ShopeeEnvironmentResolver, ErpApiTokenGuard],
})
export class CommonModule {}
