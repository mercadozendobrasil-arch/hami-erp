import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SHOPEE_REFRESH_TOKEN_TTL_SECONDS } from 'src/common/shopee.constants';
import { ShopeeTokenService } from 'src/common/shopee-token.service';
import { ShopSdk } from 'src/shopee-sdk/modules/shop.sdk';
import { AuthSdk } from 'src/shopee-sdk/modules/auth.sdk';
import { ShopeeAuthRefreshQueueService } from 'src/infra/queue/shopee-auth-refresh.queue';

import { AuthCallbackDto } from './dto/auth-callback.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly authSdk: AuthSdk,
    private readonly shopSdk: ShopSdk,
    private readonly tokenService: ShopeeTokenService,
    private readonly refreshQueue: ShopeeAuthRefreshQueueService,
  ) {}

  createAuthorizeUrl(redirectUri?: string) {
    const finalRedirectUri =
      redirectUri ??
      this.configService.getOrThrow<string>('SHOPEE_REDIRECT_URI');
    const payload = this.authSdk.generateAuthorizationUrl(finalRedirectUri);

    return {
      ...payload,
      redirectUri: finalRedirectUri,
      expiresAt: payload.expiresAt.toISOString(),
    };
  }

  async handleCallback(payload: AuthCallbackDto) {
    const shopId = BigInt(payload.shopId);
    const tokenResponse = await this.authSdk.getAccessToken({
      code: payload.code,
      shopId,
    });

    const [shopInfo, profile] = await Promise.allSettled([
      this.shopSdk.getShopInfo({
        shopId,
        accessToken: tokenResponse.access_token,
      }),
      this.shopSdk.getProfile({
        shopId,
        accessToken: tokenResponse.access_token,
      }),
    ]);

    const saved = await this.tokenService.saveTokens({
      shopId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      accessTokenExpiresAt: new Date(
        Date.now() + tokenResponse.expire_in * 1000,
      ),
      refreshTokenExpiresAt: new Date(
        Date.now() + SHOPEE_REFRESH_TOKEN_TTL_SECONDS * 1000,
      ),
      region:
        this.getSettledValue(shopInfo)?.region ??
        this.getSettledValue(profile)?.region ??
        payload.region ??
        null,
      shopName:
        this.getSettledValue(shopInfo)?.shop_name ??
        this.getSettledValue(profile)?.shop_name ??
        null,
    });

    if (saved.token.accessTokenExpiresAt) {
      await this.refreshQueue.schedule(
        shopId,
        saved.token.accessTokenExpiresAt,
      );
    }

    return {
      shopId: saved.shop.shopId.toString(),
      shopName: saved.shop.shopName,
      accessTokenExpiresAt:
        saved.token.accessTokenExpiresAt?.toISOString() ?? null,
      refreshTokenExpiresAt:
        saved.token.refreshTokenExpiresAt?.toISOString() ?? null,
    };
  }

  async refreshToken(shopIdRaw: string) {
    const shopId = BigInt(shopIdRaw);
    const { token, shop } =
      await this.tokenService.findRequiredTokenByShopId(shopId);
    const refreshed = await this.authSdk.refreshAccessToken({
      shopId,
      refreshToken: token.refreshToken,
    });

    const saved = await this.tokenService.saveTokens({
      shopId,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + refreshed.expire_in * 1000),
      refreshTokenExpiresAt: new Date(
        Date.now() + SHOPEE_REFRESH_TOKEN_TTL_SECONDS * 1000,
      ),
      region: shop.region,
      shopName: shop.shopName,
    });

    if (saved.token.accessTokenExpiresAt) {
      await this.refreshQueue.schedule(
        shopId,
        saved.token.accessTokenExpiresAt,
      );
    }

    return {
      shopId: saved.shop.shopId.toString(),
      shopName: saved.shop.shopName,
      accessTokenExpiresAt:
        saved.token.accessTokenExpiresAt?.toISOString() ?? null,
      refreshTokenExpiresAt:
        saved.token.refreshTokenExpiresAt?.toISOString() ?? null,
    };
  }

  private getSettledValue<T>(result: PromiseSettledResult<T>): T | undefined {
    return result.status === 'fulfilled' ? result.value : undefined;
  }
}
