import { Injectable } from '@nestjs/common';

import { ShopeeTokenService } from 'src/common/shopee-token.service';
import { ShopSdk } from 'src/shopee-sdk/modules/shop.sdk';

@Injectable()
export class ShopsService {
  constructor(
    private readonly tokenService: ShopeeTokenService,
    private readonly shopSdk: ShopSdk,
  ) {}

  async listShops() {
    const shops = await this.tokenService.listShops();

    return shops.map((shop) => this.toShopResponse(shop));
  }

  async getShop(shopIdRaw: string) {
    const shopId = BigInt(shopIdRaw);
    const { shop, token } =
      await this.tokenService.findRequiredTokenByShopId(shopId);
    const [remoteShopInfo, profile] = await Promise.all([
      this.shopSdk.getShopInfo({
        shopId,
        accessToken: token.accessToken,
      }),
      this.shopSdk.getProfile({
        shopId,
        accessToken: token.accessToken,
      }),
    ]);

    return {
      ...this.toShopResponse({
        ...shop,
        tokens: [token],
      }),
      profile,
      remoteShopInfo,
    };
  }

  async syncShop(shopIdRaw: string) {
    const shopId = BigInt(shopIdRaw);
    const detail = await this.getShop(shopIdRaw);

    await this.tokenService.updateShopMetadata(shopId, {
      region:
        typeof detail.remoteShopInfo.region === 'string'
          ? detail.remoteShopInfo.region
          : null,
      shopName:
        typeof detail.remoteShopInfo.shop_name === 'string'
          ? detail.remoteShopInfo.shop_name
          : typeof detail.profile.shop_name === 'string'
            ? detail.profile.shop_name
            : null,
    });

    return this.getShop(shopIdRaw);
  }

  private toShopResponse(shop: {
    shopId: bigint;
    shopName: string | null;
    region: string | null;
    status: string;
    tokens: Array<{
      accessTokenExpiresAt: Date | null;
      refreshTokenExpiresAt: Date | null;
    }>;
  }) {
    const token = shop.tokens[0];

    return {
      shopId: shop.shopId.toString(),
      shopName: shop.shopName,
      region: shop.region,
      status: shop.status,
      token: token
        ? {
            accessTokenExpiresAt:
              token.accessTokenExpiresAt?.toISOString() ?? null,
            refreshTokenExpiresAt:
              token.refreshTokenExpiresAt?.toISOString() ?? null,
          }
        : null,
    };
  }
}
