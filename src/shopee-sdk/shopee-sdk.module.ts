import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ShopeeClient } from './shopee-client';
import { ShopeeErrorMapper } from './shopee-error.mapper';
import { ShopeeHttpService } from './shopee-http.service';
import { ShopeeSignature } from './shopee-signature';
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

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SHOPEE_SDK_OPTIONS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ShopeeSdkConfig => ({
        baseUrl: configService.get<string>(
          'SHOPEE_BASE_URL',
          'https://partner.shopeemobile.com',
        ),
        partnerId: Number(configService.get<string>('SHOPEE_PARTNER_ID', '0')),
        partnerKey: configService.get<string>('SHOPEE_PARTNER_KEY', ''),
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
            configService.get<string>('SHOPEE_RATE_LIMIT_MIN_INTERVAL_MS', '0'),
          ),
        },
      }),
    },
    {
      provide: SHOPEE_API_LOGGER,
      useValue: noopShopeeApiLogger,
    },
    ShopeeSignature,
    ShopeeErrorMapper,
    ShopeeHttpService,
    ShopeeClient,
  ],
  exports: [
    SHOPEE_SDK_OPTIONS,
    SHOPEE_API_LOGGER,
    ShopeeSignature,
    ShopeeErrorMapper,
    ShopeeHttpService,
    ShopeeClient,
  ],
})
export class ShopeeSdkModule {}
