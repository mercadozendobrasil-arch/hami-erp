import { InternalServerErrorException } from '@nestjs/common';

import {
  resolveErpApiAccessCredentials,
  validateErpApiAccessConfig,
} from '../src/common/auth/erp-api-access.util';

describe('erp-api-access.util', () => {
  it('resolves legacy ERP bearer tokens as full-access credentials', () => {
    expect(
      resolveErpApiAccessCredentials({
        ERP_API_BEARER_TOKEN: 'legacy-token',
      }),
    ).toEqual([
      {
        role: 'legacy-admin',
        token: 'legacy-token',
        permissions: ['erp.read', 'erp.write', 'erp.jobs.read'],
      },
    ]);
  });

  it('resolves ERP_API_ACCESS role mappings', () => {
    expect(
      resolveErpApiAccessCredentials({
        ERP_API_ACCESS: JSON.stringify({
          viewer: {
            token: 'viewer-token',
            permissions: ['erp.read'],
          },
          admin: {
            token: 'admin-token',
            permissions: ['erp.read', 'erp.write', 'erp.jobs.read'],
          },
        }),
      }),
    ).toEqual([
      {
        role: 'viewer',
        token: 'viewer-token',
        permissions: ['erp.read'],
      },
      {
        role: 'admin',
        token: 'admin-token',
        permissions: ['erp.read', 'erp.write', 'erp.jobs.read'],
      },
    ]);
  });

  it('throws when ERP access configuration is missing entirely', () => {
    expect(() => validateErpApiAccessConfig({})).toThrow(
      InternalServerErrorException,
    );
    expect(() => validateErpApiAccessConfig({})).toThrow(
      'Either ERP_API_ACCESS or ERP_API_BEARER_TOKEN must be configured.',
    );
  });

  it('throws when ERP_API_ACCESS contains invalid JSON', () => {
    expect(() =>
      validateErpApiAccessConfig({
        ERP_API_ACCESS: '{oops',
      }),
    ).toThrow('ERP_API_ACCESS must be valid JSON.');
  });
});
