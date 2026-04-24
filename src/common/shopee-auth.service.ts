import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from 'src/infra/database/prisma.service';

import { DEFAULT_SHOPEE_BASE_URL } from './shopee.constants';

interface ShopeeShopCredentials {
  internalShopRef: string;
  shopId: string;
  accessToken: string;
}

@Injectable()
export class ShopeeAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  getPartnerId(): number {
    const partnerId = this.configService.get<string>('SHOPEE_PARTNER_ID');

    if (!partnerId) {
      throw new UnauthorizedException(
        'Missing SHOPEE_PARTNER_ID configuration.',
      );
    }

    return Number(partnerId);
  }

  getPartnerKey(): string {
    const partnerKey = this.configService.get<string>('SHOPEE_PARTNER_KEY');

    if (!partnerKey) {
      throw new UnauthorizedException(
        'Missing SHOPEE_PARTNER_KEY configuration.',
      );
    }

    return partnerKey;
  }

  getWebhookSecret(): string {
    return (
      this.configService.get<string>('SHOPEE_WEBHOOK_SECRET') ??
      this.getPartnerKey()
    );
  }

  getBaseUrl(): string {
    return (
      this.configService.get<string>('SHOPEE_BASE_URL') ??
      DEFAULT_SHOPEE_BASE_URL
    );
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
