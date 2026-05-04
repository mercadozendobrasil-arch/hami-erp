import { request } from '@umijs/max';
import { login } from './api';

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}));

describe('ant-design-pro api service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (request as jest.Mock).mockResolvedValue({ status: 'ok' });
  });

  it('sends only backend login fields to ERP auth', async () => {
    await login({
      username: 'admin',
      password: 'password123',
      autoLogin: true,
      type: 'account',
    });

    expect(request).toHaveBeenCalledWith(
      '/api/erp/auth/login',
      expect.objectContaining({
        data: {
          username: 'admin',
          password: 'password123',
        },
      }),
    );
  });
});
