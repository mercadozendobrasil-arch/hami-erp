import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ShopeeEnvironmentResolver } from '../src/common/shopee-environment.resolver';

describe('ShopeeEnvironmentResolver', () => {
  const createResolver = (values: Record<string, string | undefined>) =>
    new ShopeeEnvironmentResolver(new ConfigService(values));

  it('selects sandbox configuration when SHOPEE_ENV is sandbox', () => {
    const resolver = createResolver({
      SHOPEE_ENV: 'sandbox',
      SHOPEE_SANDBOX_BASE_URL: 'https://partner.test-stable.shopeemobile.com',
      SHOPEE_SANDBOX_PARTNER_ID: '1001',
      SHOPEE_SANDBOX_PARTNER_KEY: 'sandbox-key',
      SHOPEE_SANDBOX_REDIRECT_URL: 'https://sandbox.example.com/callback',
    });

    expect(resolver.getCurrentConfig()).toEqual({
      env: 'sandbox',
      baseUrl: 'https://partner.test-stable.shopeemobile.com',
      partnerId: 1001,
      partnerKey: 'sandbox-key',
      redirectUrl: 'https://sandbox.example.com/callback',
    });
  });

  it('selects production configuration when SHOPEE_ENV is production', () => {
    const resolver = createResolver({
      SHOPEE_ENV: 'production',
      SHOPEE_PROD_BASE_URL: 'https://partner.shopeemobile.com',
      SHOPEE_PROD_PARTNER_ID: '2002',
      SHOPEE_PROD_PARTNER_KEY: 'prod-key',
      SHOPEE_PROD_REDIRECT_URL: 'https://prod.example.com/callback',
    });

    expect(resolver.getCurrentConfig()).toEqual({
      env: 'production',
      baseUrl: 'https://partner.shopeemobile.com',
      partnerId: 2002,
      partnerKey: 'prod-key',
      redirectUrl: 'https://prod.example.com/callback',
    });
  });

  it('throws when SHOPEE_ENV is invalid', () => {
    expect(() =>
      createResolver({
        SHOPEE_ENV: 'staging',
      }),
    ).toThrow(InternalServerErrorException);
  });

  it('defaults to sandbox configuration when SHOPEE_ENV is not set', () => {
    const resolver = createResolver({
      SHOPEE_SANDBOX_BASE_URL: 'https://partner.test-stable.shopeemobile.com',
      SHOPEE_SANDBOX_PARTNER_ID: '1001',
      SHOPEE_SANDBOX_PARTNER_KEY: 'sandbox-key',
      SHOPEE_SANDBOX_REDIRECT_URL: 'https://sandbox.example.com/callback',
    });

    expect(resolver.getCurrentConfig().env).toBe('sandbox');
  });

  it('falls back to sandbox when production credentials are incomplete', () => {
    const resolver = createResolver({
      SHOPEE_ENV: 'production',
      SHOPEE_SANDBOX_PARTNER_ID: '1001',
      SHOPEE_SANDBOX_PARTNER_KEY: 'sandbox-key',
      SHOPEE_SANDBOX_REDIRECT_URL: 'https://sandbox.example.com/callback',
      SHOPEE_PROD_PARTNER_ID: '2002',
    });

    expect(resolver.getCurrentConfig().env).toBe('sandbox');
    expect(resolver.getCurrentConfig().partnerId).toBe(1001);
  });

  it('throws when partnerId is missing for the active environment', () => {
    expect(() =>
      createResolver({
        SHOPEE_ENV: 'sandbox',
        SHOPEE_SANDBOX_PARTNER_KEY: 'sandbox-key',
        SHOPEE_SANDBOX_REDIRECT_URL: 'https://sandbox.example.com/callback',
      }),
    ).toThrow('Missing SHOPEE_SANDBOX_PARTNER_ID configuration.');
  });

  it('throws when partnerKey is missing for the active sandbox environment', () => {
    expect(() =>
      createResolver({
        SHOPEE_ENV: 'sandbox',
        SHOPEE_SANDBOX_PARTNER_ID: '1001',
        SHOPEE_SANDBOX_REDIRECT_URL: 'https://sandbox.example.com/callback',
      }),
    ).toThrow('Missing SHOPEE_SANDBOX_PARTNER_KEY configuration.');
  });
});
