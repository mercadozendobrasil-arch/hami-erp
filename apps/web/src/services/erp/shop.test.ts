import { request } from '@umijs/max';
import { getShopeeAuthUrl, queryShops } from './shop';

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}));

describe('shop service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes raw shop arrays for ProTable', async () => {
    (request as jest.Mock).mockResolvedValue([
      { shopId: '1001', shopName: 'Main Store', status: 'AUTHORIZED' },
    ]);

    await expect(queryShops({ current: 1, pageSize: 10 })).resolves.toEqual({
      success: true,
      data: [{ shopId: '1001', shopName: 'Main Store', status: 'AUTHORIZED' }],
      total: 1,
      current: 1,
      pageSize: 10,
    });
  });

  it('passes the current page redirect to the backend when creating Shopee auth URLs', async () => {
    (request as jest.Mock).mockResolvedValue({
      authorizationUrl: 'https://openplatform.sandbox.test-stable.shopee.sg/api/v2/shop/auth_partner',
      redirectUri: 'https://hamimih.com/shop/auth/',
    });

    await expect(
      getShopeeAuthUrl('https://hamimih.com/shop/auth/'),
    ).resolves.toMatchObject({
      url: 'https://openplatform.sandbox.test-stable.shopee.sg/api/v2/shop/auth_partner',
      redirectUrl: 'https://hamimih.com/shop/auth/',
    });

    expect(request).toHaveBeenCalledWith('/api/shopee/auth/authorize-url', {
      method: 'POST',
      data: { redirectUri: 'https://hamimih.com/shop/auth/' },
    });
  });
});
