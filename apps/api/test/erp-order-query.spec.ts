import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  ErpOrderQueryDto,
  ErpOrderStatusCountQueryDto,
} from '../src/erp/orders/dto/erp-order-query.dto';

describe('ErpOrderQueryDto', () => {
  it('accepts ProTable list parameters from the order center', async () => {
    const dto = plainToInstance(ErpOrderQueryDto, {
      current: '1',
      pageSize: '10',
      token: '123',
      currentTab: 'all',
      sorter: '{}',
      shopId: '227368441',
    });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
    expect(dto.current).toBe(1);
    expect(dto.pageSize).toBe(10);
    expect(dto.token).toBe('123');
    expect(dto.currentTab).toBe('all');
    expect(dto.sorter).toBe('{}');
    expect(dto.shopId).toBe('227368441');
  });

  it('accepts ProTable token on order status count requests', async () => {
    const dto = plainToInstance(ErpOrderStatusCountQueryDto, {
      token: '123',
    });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
    expect(dto.token).toBe('123');
  });
});
