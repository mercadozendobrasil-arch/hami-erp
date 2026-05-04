import { ConfigService } from '@nestjs/config';

import { ShopeeEnvironmentResolver } from '../src/common/shopee-environment.resolver';
import { ShopeeClient } from '../src/shopee-sdk/shopee-client';
import { ShopeeSignature } from '../src/shopee-sdk/shopee-signature';
import { ShopeeErrorMapper } from '../src/shopee-sdk/shopee-error.mapper';
import { ShopeeHttpService } from '../src/shopee-sdk/shopee-http.service';
import { AuthSdk } from '../src/shopee-sdk/modules/auth.sdk';
import { ORDER_DETAIL_RESPONSE_OPTIONAL_FIELDS } from '../src/shopee-sdk/modules/order.sdk';
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
      'https://openplatform.sandbox.test-stable.shopee.sg',
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
        SHOPEE_PROD_PARTNER_KEY: '',
        SHOPEE_PROD_REDIRECT_URL: '',
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

  it('accepts token payloads returned at the top level by Shopee auth endpoints', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expire_in: 14400,
          request_id: 'request-token',
          shop_id_list: [123],
          error: '',
          message: '',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    const config = {
      baseUrl: 'https://openplatform.sandbox.test-stable.shopee.sg',
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
    const authSdk = new AuthSdk(client);

    await expect(
      authSdk.getAccessToken({ code: 'code', shopId: 123n }),
    ).resolves.toMatchObject({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expire_in: 14400,
      request_id: 'request-token',
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const requestBody = typeof init.body === 'string' ? init.body : '';

    expect(new URL(url).pathname).toBe('/api/v2/auth/token/get');
    expect(JSON.parse(requestBody)).toEqual({
      partner_id: 1001,
      code: 'code',
      shop_id: 123,
    });
  });

  it('does not request order detail fields rejected by Shopee sandbox', () => {
    expect(ORDER_DETAIL_RESPONSE_OPTIONAL_FIELDS.split(',')).not.toContain(
      'package_list',
    );
  });
});
