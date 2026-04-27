import { ConfigService } from '@nestjs/config';

import { ShopeeEnvironmentResolver } from '../src/common/shopee-environment.resolver';
import { ShopeeClient } from '../src/shopee-sdk/shopee-client';
import { ShopeeSignature } from '../src/shopee-sdk/shopee-signature';
import { ShopeeErrorMapper } from '../src/shopee-sdk/shopee-error.mapper';
import { ShopeeHttpService } from '../src/shopee-sdk/shopee-http.service';
import { ProductSdk } from '../src/shopee-sdk/modules/product.sdk';

describe('Shopee SDK self-hosted client', () => {
  it('defaults to sandbox configuration before production credentials are selected', () => {
    const resolver = new ShopeeEnvironmentResolver(
      new ConfigService({
        SHOPEE_SANDBOX_PARTNER_ID: '1001',
        SHOPEE_SANDBOX_PARTNER_KEY: 'sandbox-key',
        SHOPEE_SANDBOX_REDIRECT_URL: 'https://sandbox.example.com/callback',
      }),
    );

    expect(resolver.getCurrentConfig().env).toBe('sandbox');
    expect(resolver.getCurrentConfig().baseUrl).toBe(
      'https://partner.test-stable.shopeemobile.com',
    );
  });

  it('keeps sandbox active when production is requested without complete production credentials', () => {
    const resolver = new ShopeeEnvironmentResolver(
      new ConfigService({
        SHOPEE_ENV: 'production',
        SHOPEE_SANDBOX_PARTNER_ID: '1001',
        SHOPEE_SANDBOX_PARTNER_KEY: 'sandbox-key',
        SHOPEE_SANDBOX_REDIRECT_URL: 'https://sandbox.example.com/callback',
        SHOPEE_PROD_PARTNER_ID: '2002',
      }),
    );

    expect(resolver.getCurrentConfig().env).toBe('sandbox');
    expect(resolver.getCurrentConfig().partnerId).toBe(1001);
  });

  it('uses Shopee v2 endpoints and snake_case payloads from SDK modules', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: 'request-1',
          response: { item_id: 123 },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    const config = {
      baseUrl: 'https://partner.test-stable.shopeemobile.com',
      environment: 'sandbox' as const,
      apiVersion: 'v2',
      partnerId: 1001,
      partnerKey: 'sandbox-key',
      timeoutMs: 1000,
      retry: {
        maxAttempts: 1,
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
      rateLimit: {
        minIntervalMs: 0,
      },
      fetchImpl,
    };
    const signature = new ShopeeSignature(config);
    const client = new ShopeeClient(
      new ShopeeHttpService(
        config,
        { log: jest.fn() },
        signature,
        new ShopeeErrorMapper(),
      ),
      signature,
    );
    const productSdk = new ProductSdk(client);

    await productSdk.addItem(
      { accessToken: 'token', shopId: 123 },
      {
        categoryId: 321,
        originalPrice: 10,
        itemName: 'Demo product',
      },
    );

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const requestBody = typeof init.body === 'string' ? init.body : '';

    expect(new URL(url).pathname).toBe('/api/v2/product/add_item');
    expect(JSON.parse(requestBody)).toEqual({
      category_id: 321,
      original_price: 10,
      item_name: 'Demo product',
    });
  });
});
