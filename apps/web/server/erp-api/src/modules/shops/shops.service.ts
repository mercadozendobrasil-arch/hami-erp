import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ShopeeService } from '../shopee/shopee.service';

type PageQuery = {
  current: number;
  pageSize: number;
};

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shopeeService: ShopeeService,
  ) {}

  async findMany(query: PageQuery) {
    const skip = (query.current - 1) * query.pageSize;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.channelShop.findMany({
        include: {
          token: true,
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: query.pageSize,
      }),
      this.prisma.channelShop.count(),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        channel: row.channel,
        siteCode: row.siteCode,
        shopId: row.shopId,
        shopName: row.shopName,
        status: row.status,
        tokenExpireAt: row.token?.expireAt.toISOString() || null,
        productCount: row._count.products,
        orderCount: row._count.orders,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      success: true,
      current: query.current,
      pageSize: query.pageSize,
    };
  }

  async sync(shopId: string) {
    return this.shopeeService.syncAuthorizedShop(shopId);
  }

  async syncProducts(shopId: string) {
    return this.shopeeService.syncShopProducts(shopId);
  }

  async syncOrders(shopId: string) {
    return this.shopeeService.syncShopOrders(shopId);
  }
}
