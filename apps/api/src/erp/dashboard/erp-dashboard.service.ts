import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';

import { erpData } from '../common/erp-response';

@Injectable()
export class ErpDashboardService {
  constructor(private readonly prismaService: PrismaService) {}

  async getSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      shopCount,
      productCount,
      orderCount,
      todayOrderCount,
      todayOrderSales,
    ] = await this.prismaService.$transaction([
      this.prismaService.shopeeShop.count(),
      this.prismaService.erpProduct.count(),
      this.prismaService.erpOrderProjection.count(),
      this.prismaService.erpOrderProjection.count({
        where: {
          createTime: {
            gte: todayStart,
          },
        },
      }),
      this.prismaService.erpOrderProjection.aggregate({
        where: {
          createTime: {
            gte: todayStart,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    return erpData({
      shopCount,
      productCount,
      orderCount,
      todayOrderCount,
      todaySalesAmount: this.decimalToMoney(todayOrderSales._sum.totalAmount),
    });
  }

  private decimalToMoney(value: Prisma.Decimal | null | undefined) {
    return (value?.toNumber() ?? 0).toFixed(2);
  }
}
