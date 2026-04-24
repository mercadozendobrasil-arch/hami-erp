import { ApiProperty } from '@nestjs/swagger';

export class ShopTokenSummaryDto {
  @ApiProperty()
  accessTokenExpiresAt!: string | null;

  @ApiProperty()
  refreshTokenExpiresAt!: string | null;
}

export class ShopResponseDto {
  @ApiProperty()
  shopId!: string;

  @ApiProperty()
  shopName!: string | null;

  @ApiProperty()
  region!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  token!: ShopTokenSummaryDto | null;
}

export class ShopDetailResponseDto extends ShopResponseDto {
  @ApiProperty()
  profile!: Record<string, unknown> | null;

  @ApiProperty()
  remoteShopInfo!: Record<string, unknown> | null;
}
