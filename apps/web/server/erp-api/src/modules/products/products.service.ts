import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type ProductQuery = {
  current: number;
  pageSize: number;
  shopId?: string;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: ProductQuery) {
    const skip = (query.current - 1) * query.pageSize;

    const where = query.shopId
      ? {
          shopId: query.shopId,
        }
      : undefined;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.erpProduct.findMany({
        where,
        include: {
          shop: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: query.pageSize,
      }),
      this.prisma.erpProduct.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        channel: row.channel,
        siteCode: row.siteCode,
        shopId: row.shopId,
        shopName: row.shop.shopName,
        platformProductId: row.platformProductId,
        title: row.title,
        status: row.status,
        stock: row.stock,
        price: row.price.toString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      success: true,
      current: query.current,
      pageSize: query.pageSize,
    };
  }
}
