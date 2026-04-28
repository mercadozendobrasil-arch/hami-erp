import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import {
  ERP_API_PERMISSION_METADATA_KEY,
  ErpApiAccessCredential,
  ErpApiPermission,
} from '../auth/erp-api-access.types';
import { resolveErpApiAccessCredentials } from '../auth/erp-api-access.util';

@Injectable()
export class ErpApiTokenGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const credentials = this.resolveCredentials();
    if (credentials.length === 0) {
      throw new InternalServerErrorException(
        'Either ERP_API_ACCESS or ERP_API_BEARER_TOKEN must be configured.',
      );
    }

    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const authorizationHeader =
      request.headers?.authorization ?? request.headers?.Authorization;
    const providedValue = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;

    if (!providedValue) {
      throw new UnauthorizedException('Missing Authorization header.');
    }

    const [scheme, token] = providedValue.split(' ', 2);

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid ERP API bearer token.');
    }

    const matchedCredential = credentials.find(
      (credential) => credential.token === token,
    );

    if (!matchedCredential) {
      throw new UnauthorizedException('Invalid ERP API bearer token.');
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<ErpApiPermission[]>(
        ERP_API_PERMISSION_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    const missingPermissions = requiredPermissions.filter(
      (permission) => !matchedCredential.permissions.includes(permission),
    );

    if (missingPermissions.length > 0) {
      throw new ForbiddenException(
        `ERP API token is missing required permissions: ${missingPermissions.join(', ')}.`,
      );
    }

    return true;
  }

  private resolveCredentials(): ErpApiAccessCredential[] {
    return resolveErpApiAccessCredentials({
      ERP_API_ACCESS: this.configService.get<string>('ERP_API_ACCESS'),
      ERP_API_BEARER_TOKEN: this.configService.get<string>('ERP_API_BEARER_TOKEN'),
    });
  }
}
