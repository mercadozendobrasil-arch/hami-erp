import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import {
  AuthCallbackDto,
  AuthCallbackResponseDto,
} from './dto/auth-callback.dto';
import {
  AuthorizeUrlResponseDto,
  CreateAuthorizeUrlDto,
} from './dto/authorize-url.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthService } from './auth.service';

@ApiTags('shopee-auth')
@Controller('shopee/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('authorize-url')
  @ApiOkResponse({
    type: AuthorizeUrlResponseDto,
  })
  createAuthorizeUrl(@Body() body: CreateAuthorizeUrlDto) {
    return this.authService.createAuthorizeUrl(body.redirectUri);
  }

  @Post('callback')
  @ApiOkResponse({
    type: AuthCallbackResponseDto,
  })
  handleCallback(@Body() body: AuthCallbackDto) {
    return this.authService.handleCallback(body);
  }

  @Post('refresh-token')
  @ApiOkResponse({
    type: AuthCallbackResponseDto,
  })
  refreshToken(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body.shopId);
  }
}
