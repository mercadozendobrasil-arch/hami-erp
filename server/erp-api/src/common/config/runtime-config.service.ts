import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRedisRuntimeConfig, type RedisRuntimeConfig } from './redis.config';

@Injectable()
export class RuntimeConfigService {
  constructor(private readonly configService: ConfigService) {}

  getFrontendBaseUrl() {
    return this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  getShopeeRedirectUrl() {
    return this.configService.getOrThrow<string>('SHOPEE_REDIRECT_URL');
  }

  getShopeePartnerId() {
    return this.configService.getOrThrow<string>('SHOPEE_PARTNER_ID');
  }

  getShopeePartnerKey() {
    return this.configService.getOrThrow<string>('SHOPEE_PARTNER_KEY');
  }

  getRedisConfig(): RedisRuntimeConfig {
    return getRedisRuntimeConfig(this.configService);
  }

  buildFrontendCallbackUrl(params: Record<string, string>) {
    const redirect = new URL('/shop/auth', this.getFrontendBaseUrl());

    Object.entries(params).forEach(([key, value]) => {
      redirect.searchParams.set(key, value);
    });

    return redirect.toString();
  }
}
