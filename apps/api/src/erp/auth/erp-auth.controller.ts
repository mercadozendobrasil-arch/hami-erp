import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { ErpLoginDto } from './dto/erp-auth.dto';
import { ErpAuthService } from './erp-auth.service';

@Controller('erp/auth')
export class ErpAuthController {
  constructor(private readonly erpAuthService: ErpAuthService) {}

  @Post('login')
  async login(
    @Body() payload: ErpLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.erpAuthService.login(payload, {
      ipAddress: request.ip,
      userAgent: Array.isArray(request.headers['user-agent'])
        ? request.headers['user-agent'].join(',')
        : request.headers['user-agent'],
    });
    response.setHeader('Set-Cookie', result.cookie);
    return result.data;
  }

  @Get('me')
  me(@Req() request: Request) {
    return this.erpAuthService.me(
      this.erpAuthService.extractToken(request.headers.cookie),
    );
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Set-Cookie', this.erpAuthService.createLogoutCookie());
    return { success: true, data: { status: 'ok' } };
  }
}
