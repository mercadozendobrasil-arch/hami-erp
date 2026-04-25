import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShopeeShop, ShopeeToken } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';

import { ShopeeTokenStorageInput } from './shopee.types';

type ShopWithLatestToken = Prisma.ShopeeShopGetPayload<{
  include: {
    tokens: true;
  };
}>;

@Injectable()
export class ShopeeTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async saveTokens(input: ShopeeTokenStorageInput) {
    return await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const shop = await tx.shopeeShop.upsert({
          where: {
            shopId: input.shopId,
          },
          update: {
            region: input.region ?? undefined,
            shopName: input.shopName ?? undefined,
          },
          create: {
            shopId: input.shopId,
            region: input.region ?? null,
            shopName: input.shopName ?? null,
          },
        });

        const latestToken = await tx.shopeeToken.findFirst({
          where: {
            shopRef: shop.id,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });

        const tokenPayload: Prisma.ShopeeTokenUncheckedCreateInput &
          Prisma.ShopeeTokenUncheckedUpdateInput = {
          shopRef: shop.id,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
          accessTokenExpiresAt: input.accessTokenExpiresAt,
          refreshTokenExpiresAt: input.refreshTokenExpiresAt,
        };

        const token = latestToken
          ? await tx.shopeeToken.update({
              where: {
                id: latestToken.id,
              },
              data: tokenPayload,
            })
          : await tx.shopeeToken.create({
              data: tokenPayload,
            });

        return {
          shop,
          token,
        };
      },
    );
  }

  async findRequiredTokenByShopId(
    shopId: bigint,
  ): Promise<{ shop: ShopWithLatestToken; token: ShopeeToken }> {
    const shop = await this.prisma.shopeeShop.findUnique({
      where: {
        shopId,
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

    if (!shop || shop.tokens.length === 0) {
      throw new NotFoundException(
        `Shopee token not found for shop ${shopId.toString()}.`,
      );
    }

    return {
      shop,
      token: shop.tokens[0],
    };
  }

  async listShops(): Promise<ShopWithLatestToken[]> {
    return await this.prisma.shopeeShop.findMany({
      include: {
        tokens: {
          orderBy: {
            updatedAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async updateShopMetadata(
    shopId: bigint,
    payload: Pick<ShopeeTokenStorageInput, 'region' | 'shopName'>,
  ) {
    return await this.prisma.shopeeShop.update({
      where: {
        shopId,
      },
      data: {
        region: payload.region ?? undefined,
        shopName: payload.shopName ?? undefined,
      },
    });
  }
}

export interface ShopeeShopWithToken extends ShopeeShop {
  tokens: ShopeeToken[];
}
