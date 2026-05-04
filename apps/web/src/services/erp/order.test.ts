describe('order service fallback', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFallback = process.env.ERP_ORDER_FALLBACK_MOCK;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalFallback === undefined) {
      delete process.env.ERP_ORDER_FALLBACK_MOCK;
    } else {
      process.env.ERP_ORDER_FALLBACK_MOCK = originalFallback;
    }
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('uses local order data by default in development when legacy order APIs are unavailable', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ERP_ORDER_FALLBACK_MOCK;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.doMock('@umijs/max', () => ({
      request: jest.fn().mockRejectedValue(new Error('404')),
    }));

    const { queryLogisticsOrders } = require('./order');

    await expect(queryLogisticsOrders({ current: 1, pageSize: 10 })).resolves.toEqual(
      expect.objectContaining({
        success: true,
        data: expect.any(Array),
      }),
    );
    warnSpy.mockRestore();
  });
});
