import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const erpModulePath = join(__dirname, '..', 'src', 'erp', 'erp.module.ts');

describe('ErpModule', () => {
  it('registers ERP dashboard and sync-log controllers', () => {
    const source = readFileSync(erpModulePath, 'utf8');

    expect(source).toContain('ErpDashboardController');
    expect(source).toContain('ErpSyncLogsController');
    expect(source).toContain('ErpFiscalController');
    expect(source).toContain('ErpFiscalService');
  });
});
