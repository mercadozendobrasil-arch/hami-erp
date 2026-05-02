import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ShopeeEnvironmentResolver } from 'src/common/shopee-environment.resolver';

import { ShopeeClient } from './shopee-client';
import { ShopeeErrorMapper } from './shopee-error.mapper';
import { ShopeeHttpService } from './shopee-http.service';
import { ShopeeSignature } from './shopee-signature';
import { AuthSdk } from './modules/auth.sdk';
import { InvoiceSdk } from './modules/invoice.sdk';
import { LogisticsSdk } from './modules/logistics.sdk';
import { MediaSdk } from './modules/media.sdk';
import { OrderSdk } from './modules/order.sdk';
import { PaymentSdk } from './modules/payment.sdk';
import { ProductSdk } from './modules/product.sdk';
import { ShopSdk } from './modules/shop.sdk';
import { WebhookSdk } from './modules/webhook.sdk';
import {
  SHOPEE_API_LOGGER,
  SHOPEE_SDK_OPTIONS,
  type ShopeeApiLogger,
  type ShopeeSdkConfig,
} from './sdk.types';

const noopShopeeApiLogger: ShopeeApiLogger = {
  log() {
    return undefined;
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SHOPEE_SDK_OPTIONS,
      inject: [ConfigService, ShopeeEnvironmentResolver],
      useFactory: (
        configService: ConfigService,
        shopeeEnvironmentResolver: ShopeeEnvironmentResolver,
      ): ShopeeSdkConfig => {
        const shopeeConfig = shopeeEnvironmentResolver.getCurrentConfig();

        return {
          baseUrl: shopeeConfig.baseUrl,
          environment: shopeeConfig.env,
          apiVersion: configService.get<string>('SHOPEE_API_VERSION', 'v2'),
          partnerId: shopeeConfig.partnerId,
          partnerKey: shopeeConfig.partnerKey,
          timeoutMs: Number(
            configService.get<string>('SHOPEE_TIMEOUT_MS', '10000'),
          ),
          retry: {
            maxAttempts: Number(
              configService.get<string>('SHOPEE_RETRY_MAX_ATTEMPTS', '3'),
            ),
            baseDelayMs: Number(
              configService.get<string>('SHOPEE_RETRY_BASE_DELAY_MS', '300'),
            ),
            maxDelayMs: Number(
              configService.get<string>('SHOPEE_RETRY_MAX_DELAY_MS', '2000'),
            ),
          },
          rateLimit: {
            minIntervalMs: Number(
              configService.get<string>(
                'SHOPEE_RATE_LIMIT_MIN_INTERVAL_MS',
                '0',
              ),
            ),
          },
        };
      },
    },
    {
      provide: SHOPEE_API_LOGGER,
      useValue: noopShopeeApiLogger,
    },
    ShopeeSignature,
    ShopeeErrorMapper,
    ShopeeHttpService,
    ShopeeClient,
    AuthSdk,
    InvoiceSdk,
    ShopSdk,
    ProductSdk,
    MediaSdk,
    LogisticsSdk,
    OrderSdk,
    PaymentSdk,
    WebhookSdk,
  ],
  exports: [
    SHOPEE_SDK_OPTIONS,
    SHOPEE_API_LOGGER,
    ShopeeSignature,
    ShopeeErrorMapper,
    ShopeeHttpService,
    ShopeeClient,
    AuthSdk,
    InvoiceSdk,
    ShopSdk,
    ProductSdk,
    MediaSdk,
    LogisticsSdk,
    OrderSdk,
    PaymentSdk,
    WebhookSdk,
  ],
})
export class ShopeeSdkModule {}
