import { errorConfig } from './requestErrorConfig';

const errorThrower = errorConfig.errorConfig?.errorThrower as (res: unknown) => void;

describe('request error config', () => {
  it('accepts successful responses that do not use the business envelope', () => {
    expect(() => errorThrower([{ id: 'shop-1' }])).not.toThrow();
    expect(() => errorThrower({ data: [{ id: 'shop-1' }] })).not.toThrow();
  });

  it('throws BizError when the backend explicitly marks success as false', () => {
    expect(() =>
      errorThrower({
        success: false,
        errorMessage: 'failed',
        data: null,
      }),
    ).toThrow('failed');
  });
});
