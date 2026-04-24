import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';

export class CreateAuthorizeUrlDto {
  @ApiPropertyOptional({
    description:
      'Optional redirect URI override. Falls back to the active Shopee environment redirect URL.',
  })
  @IsOptional()
  @IsUrl({
    require_tld: false,
  })
  redirectUri?: string;
}

export class AuthorizeUrlResponseDto {
  @ApiPropertyOptional()
  authorizationUrl!: string;

  @ApiPropertyOptional()
  expiresAt!: string;

  @ApiPropertyOptional()
  timestamp!: number;

  @ApiPropertyOptional()
  redirectUri!: string;
}
