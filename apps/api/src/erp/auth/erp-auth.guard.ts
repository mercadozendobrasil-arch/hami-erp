import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { ErpAuthService } from './erp-auth.service';

@Injectable()
export class ErpAuthGuard implements CanActivate {
  constructor(private readonly erpAuthService: ErpAuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path ?? request.url ?? '';
    if (!this.isProtectedErpPath(path) || this.isPublicAuthPath(path)) {
      return true;
    }

    try {
      await this.erpAuthService.me(
        this.erpAuthService.extractToken(request.headers.cookie),
      );
      return true;
    } catch {
      throw new UnauthorizedException('ERP login required.');
    }
  }

  private isProtectedErpPath(path: string) {
    return path.startsWith('/api/erp/') || path.startsWith('/erp/');
  }

  private isPublicAuthPath(path: string) {
    return path.endsWith('/erp/auth/login') || path.endsWith('/erp/auth/logout');
  }
}
