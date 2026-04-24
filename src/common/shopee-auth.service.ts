import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from 'src/infra/database/prisma.service';

import { ShopeeEnvironmentResolver } from './shopee-environment.resolver';

interface ShopeeShopCredentials {
  internalShopRef: string;
  shopId: string;
  accessToken: string;
}

@Injectable()
export class ShopeeAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly shopeeEnvironmentResolver: ShopeeEnvironmentResolver,
    private readonly prismaService: PrismaService,
  ) {}

  getPartnerId(): number {
    return this.shopeeEnvironmentResolver.getCurrentConfig().partnerId;
  }

  getPartnerKey(): string {
    return this.shopeeEnvironmentResolver.getCurrentConfig().partnerKey;
  }

  getWebhookSecret(): string {
    return (
      this.configService.get<string>('SHOPEE_WEBHOOK_SECRET') ??
      this.getPartnerKey()
    );
  }

  getBaseUrl(): string {
    return this.shopeeEnvironmentResolver.getCurrentConfig().baseUrl;
  }

  async getShopCredentials(shopId: string): Promise<ShopeeShopCredentials> {
    const shop = await this.prismaService.shopeeShop.findUnique({
      where: {
        shopId: BigInt(shopId),
      },
      include: {
        tokens: {
          orderBy: {
            updatedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!shop) {
      throw new NotFoundException(`Shopee shop ${shopId} was not found.`);
    }

    const token = shop.tokens[0];

    if (!token?.accessToken) {
      throw new UnauthorizedException(
        `Shopee shop ${shopId} does not have a valid access token.`,
      );
    }

    return {
      internalShopRef: shop.id,
      shopId: shop.shopId.toString(),
      accessToken: token.accessToken,
    };
  }
}
