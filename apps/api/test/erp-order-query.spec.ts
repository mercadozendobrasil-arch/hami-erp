import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ErpOrderQueryDto } from '../src/erp/orders/dto/erp-order-query.dto';

describe('ErpOrderQueryDto', () => {
  it('accepts ProTable list parameters from the order center', async () => {
    const dto = plainToInstance(ErpOrderQueryDto, {
      current: '1',
      pageSize: '10',
      currentTab: 'all',
      sorter: '{}',
      shopId: '227368441',
    });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
    expect(dto.current).toBe(1);
    expect(dto.pageSize).toBe(10);
    expect(dto.currentTab).toBe('all');
    expect(dto.sorter).toBe('{}');
    expect(dto.shopId).toBe('227368441');
  });
});
