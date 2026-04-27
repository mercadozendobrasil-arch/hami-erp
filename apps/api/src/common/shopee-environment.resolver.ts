import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  DEFAULT_SHOPEE_BASE_URL,
  SHOPEE_SANDBOX_BASE_URL,
} from './shopee.constants';

export type ShopeeEnvironment = 'production' | 'sandbox';

export interface ShopeeEnvironmentConfig {
  env: ShopeeEnvironment;
  baseUrl: string;
  partnerId: number;
  partnerKey: string;
  redirectUrl: string;
}

@Injectable()
export class ShopeeEnvironmentResolver {
  constructor(private readonly configService: ConfigService) {
    this.getCurrentConfig();
  }

  getCurrentConfig(): ShopeeEnvironmentConfig {
    const env = this.getEnvironment();

    return {
      env,
      baseUrl: this.getRequiredString(
        this.getEnvKey(env, 'BASE_URL'),
        env === 'production'
          ? DEFAULT_SHOPEE_BASE_URL
          : SHOPEE_SANDBOX_BASE_URL,
      ),
      partnerId: this.getRequiredNumber(this.getEnvKey(env, 'PARTNER_ID')),
      partnerKey: this.getRequiredString(this.getEnvKey(env, 'PARTNER_KEY')),
      redirectUrl: this.getRequiredString(this.getEnvKey(env, 'REDIRECT_URL')),
    };
  }

  private getEnvironment(): ShopeeEnvironment {
    const env = this.configService.get<string>('SHOPEE_ENV');

    if (!env || env === 'sandbox') {
      return 'sandbox';
    }

    if (env === 'production') {
      return this.hasRequiredEnvironmentConfig('production')
        ? 'production'
        : 'sandbox';
    }

    throw new InternalServerErrorException(
      `Invalid SHOPEE_ENV "${env ?? ''}". Expected "sandbox" or "production".`,
    );
  }

  private getEnvKey(
    env: ShopeeEnvironment,
    key: 'BASE_URL' | 'PARTNER_ID' | 'PARTNER_KEY' | 'REDIRECT_URL',
  ): string {
    return env === 'production'
      ? `SHOPEE_PROD_${key}`
      : `SHOPEE_SANDBOX_${key}`;
  }

  private hasRequiredEnvironmentConfig(env: ShopeeEnvironment): boolean {
    return (
      !!this.configService.get<string>(this.getEnvKey(env, 'PARTNER_ID')) &&
      !!this.configService.get<string>(this.getEnvKey(env, 'PARTNER_KEY')) &&
      !!this.configService.get<string>(this.getEnvKey(env, 'REDIRECT_URL'))
    );
  }

  private getRequiredNumber(key: string): number {
    const rawValue = this.getRequiredString(key);
    const value = Number(rawValue);

    if (Number.isNaN(value)) {
      throw new InternalServerErrorException(
        `Invalid ${key} configuration. Expected a number.`,
      );
    }

    return value;
  }

  private getRequiredString(key: string, fallback?: string): string {
    const value = this.configService.get<string>(key) ?? fallback;

    if (!value) {
      throw new InternalServerErrorException(`Missing ${key} configuration.`);
    }

    return value;
  }
}
