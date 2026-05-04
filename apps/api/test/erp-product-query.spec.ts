import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ErpProductQueryDto } from '../src/erp/products/dto/erp-product-query.dto';

describe('ErpProductQueryDto', () => {
  it('accepts product center list parameters from the deployed UI', async () => {
    const dto = plainToInstance(ErpProductQueryDto, {
      token: '123',
      current: '1',
      pageSize: '50',
      shopId: '227368441',
      status: 'ACTIVE',
    });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
    expect(dto.token).toBe('123');
    expect(dto.current).toBe(1);
    expect(dto.pageSize).toBe(50);
    expect(dto.shopId).toBe('227368441');
    expect(dto.status).toBe('ACTIVE');
  });
});
