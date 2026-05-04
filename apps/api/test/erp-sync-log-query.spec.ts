import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ErpSyncLogQueryDto } from '../src/erp/sync-logs/dto/erp-sync-log-query.dto';

describe('ErpSyncLogQueryDto', () => {
  it('accepts ProTable pagination parameters', async () => {
    const dto = plainToInstance(ErpSyncLogQueryDto, {
      current: '1',
      pageSize: '10',
    });

    await expect(validate(dto, { whitelist: true, forbidNonWhitelisted: true })).resolves.toHaveLength(0);
    expect(dto.current).toBe(1);
    expect(dto.pageSize).toBe(10);
  });
});
