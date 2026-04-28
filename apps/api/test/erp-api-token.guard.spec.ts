import {
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { RequireErpPermissions } from '../src/common/auth/erp-permissions.decorator';
import { ErpApiTokenGuard } from '../src/common/guards/erp-api-token.guard';

describe('ErpApiTokenGuard', () => {
  class PermissionFixture {
    @RequireErpPermissions('erp.read')
    read() {}

    @RequireErpPermissions('erp.write')
    write() {}

    @RequireErpPermissions('erp.jobs.read')
    jobs() {}
  }

  const createContext = (authorization?: string, handlerName?: keyof PermissionFixture) =>
    ({
      getHandler: () =>
        handlerName ? PermissionFixture.prototype[handlerName] : undefined,
      getClass: () => PermissionFixture,
      switchToHttp: () => ({
        getRequest: () => ({
          headers: authorization
            ? { authorization }
            : {},
        }),
      }),
    }) as never;

  it('allows requests with the configured bearer token', () => {
    const guard = new ErpApiTokenGuard(
      new ConfigService({
        ERP_API_BEARER_TOKEN: 'secret-token',
      }),
      new Reflector(),
    );

    expect(guard.canActivate(createContext('Bearer secret-token', 'write'))).toBe(true);
  });

  it('rejects requests without an authorization header', () => {
    const guard = new ErpApiTokenGuard(
      new ConfigService({
        ERP_API_BEARER_TOKEN: 'secret-token',
      }),
      new Reflector(),
    );

    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(createContext())).toThrow(
      'Missing Authorization header.',
    );
  });

  it('rejects requests with an invalid bearer token', () => {
    const guard = new ErpApiTokenGuard(
      new ConfigService({
        ERP_API_BEARER_TOKEN: 'secret-token',
      }),
      new Reflector(),
    );

    expect(() => guard.canActivate(createContext('Bearer wrong-token'))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(createContext('Basic secret-token'))).toThrow(
      'Invalid ERP API bearer token.',
    );
  });

  it('fails closed when ERP access credentials are not configured', () => {
    const guard = new ErpApiTokenGuard(new ConfigService({}), new Reflector());

    expect(() => guard.canActivate(createContext('Bearer anything'))).toThrow(
      InternalServerErrorException,
    );
    expect(() => guard.canActivate(createContext('Bearer anything'))).toThrow(
      'Either ERP_API_ACCESS or ERP_API_BEARER_TOKEN must be configured.',
    );
  });

  it('allows role-scoped access when ERP_API_ACCESS grants the required permission', () => {
    const guard = new ErpApiTokenGuard(
      new ConfigService({
        ERP_API_ACCESS: JSON.stringify({
          viewer: {
            token: 'viewer-token',
            permissions: ['erp.read'],
          },
          operator: {
            token: 'operator-token',
            permissions: ['erp.read', 'erp.write'],
          },
        }),
      }),
      new Reflector(),
    );

    expect(guard.canActivate(createContext('Bearer viewer-token', 'read'))).toBe(true);
    expect(guard.canActivate(createContext('Bearer operator-token', 'write'))).toBe(true);
  });

  it('rejects role-scoped tokens that lack the required permission', () => {
    const guard = new ErpApiTokenGuard(
      new ConfigService({
        ERP_API_ACCESS: JSON.stringify({
          viewer: {
            token: 'viewer-token',
            permissions: ['erp.read'],
          },
        }),
      }),
      new Reflector(),
    );

    expect(() =>
      guard.canActivate(createContext('Bearer viewer-token', 'write')),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(createContext('Bearer viewer-token', 'write')),
    ).toThrow('ERP API token is missing required permissions: erp.write.');
  });

  it('rejects invalid ERP_API_ACCESS JSON', () => {
    const guard = new ErpApiTokenGuard(
      new ConfigService({
        ERP_API_ACCESS: '{not-json',
      }),
      new Reflector(),
    );

    expect(() => guard.canActivate(createContext('Bearer anything'))).toThrow(
      'ERP_API_ACCESS must be valid JSON.',
    );
  });
});
