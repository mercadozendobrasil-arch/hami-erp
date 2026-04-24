import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AuthCallbackDto {
  @ApiProperty({
    description: 'Shopee callback code.',
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: 'Authorized Shopee shop id.',
    example: '123456789',
  })
  @IsString()
  shopId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;
}

export class AuthCallbackResponseDto {
  @ApiProperty()
  shopId!: string;

  @ApiProperty()
  shopName!: string | null;

  @ApiProperty()
  accessTokenExpiresAt!: string | null;

  @ApiProperty()
  refreshTokenExpiresAt!: string | null;
}
