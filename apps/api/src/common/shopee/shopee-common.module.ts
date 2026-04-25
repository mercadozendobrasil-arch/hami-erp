import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LogisticsSdk } from '../../shopee-sdk/modules/logistics.sdk';
import { MediaSdk } from '../../shopee-sdk/modules/media.sdk';
import { ProductSdk } from '../../shopee-sdk/modules/product.sdk';
import { ShopeeHttpClient } from './shopee-http.client';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ShopeeHttpClient, ProductSdk, MediaSdk, LogisticsSdk],
  exports: [ShopeeHttpClient, ProductSdk, MediaSdk, LogisticsSdk],
})
export class ShopeeCommonModule {}
