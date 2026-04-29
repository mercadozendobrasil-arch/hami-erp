import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';

import { ErpFinanceQueryDto, RebuildErpFinanceDto } from './dto/erp-finance.dto';

@Injectable()
export class ErpFinanceService {
  constructor(private readonly prismaService: PrismaService) {}

  async listOrderProfits(query: ErpFinanceQueryDto) {
    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildSnapshotWhere(query);

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.erpOrderFinanceSnapshot.count({ where }),
      this.prismaService.erpOrderFinanceSnapshot.findMany({
        where,
        orderBy: { calculatedAt: 'desc' },
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: data.map((item) => this.toSnapshotItem(item)),
      total,
      current,
      pageSize,
    };
  }

  async getSummary(query: ErpFinanceQueryDto) {
    const where = this.buildSnapshotWhere(query);
    const [aggregate, missingCostCount] = await this.prismaService.$transaction([
      this.prismaService.erpOrderFinanceSnapshot.aggregate({
        where,
        _count: { _all: true },
        _sum: {
          revenue: true,
          productCost: true,
          platformFee: true,
          logisticsFee: true,
          otherFee: true,
          grossProfit: true,
        },
      }),
      this.prismaService.erpOrderFinanceSnapshot.count({
        where: { ...where, missingCost: true },
      }),
    ]);

    const revenue = this.decimalToNumber(aggregate._sum.revenue);
    const grossProfit = this.decimalToNumber(aggregate._sum.grossProfit);

    return {
      success: true,
      data: {
        orderCount: aggregate._count._all,
        missingCostCount,
        revenue: revenue.toFixed(2),
        productCost: this.decimalToNumber(aggregate._sum.productCost).toFixed(2),
        platformFee: this.decimalToNumber(aggregate._sum.platformFee).toFixed(2),
        logisticsFee: this.decimalToNumber(aggregate._sum.logisticsFee).toFixed(2),
        otherFee: this.decimalToNumber(aggregate._sum.otherFee).toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        grossMarginRate: revenue > 0 ? (grossProfit / revenue).toFixed(4) : null,
      },
    };
  }

  async rebuildOrderProfits(payload: RebuildErpFinanceDto) {
    const orders = await this.prismaService.erpOrderProjection.findMany({
      where: payload.shopId ? { shopId: payload.shopId } : {},
      orderBy: [{ updateTime: 'desc' }, { updatedAt: 'desc' }],
      take: payload.limit ?? 200,
    });

    let successCount = 0;
    for (const order of orders) {
      await this.rebuildOne(order);
      successCount += 1;
    }

    return {
      success: true,
      data: {
        totalCount: orders.length,
        successCount,
      },
    };
  }

  private async rebuildOne(order: {
    shopId: string;
    orderSn: string;
    totalAmount: Prisma.Decimal | null;
    currency: string | null;
    raw: Prisma.JsonValue | null;
  }) {
    const raw = this.asRecord(order.raw);
    const items = this.collectOrderItems(raw);
    let productCost = 0;
    let missingCost = false;
    const costLines = [];

    for (const item of items) {
      const mappedSku = await this.findMappedSku(order.shopId, item);
      const unitCost = this.decimalToNumber(mappedSku?.costPrice ?? mappedSku?.price);
      if (!mappedSku || unitCost <= 0) {
        missingCost = true;
      }
      const lineCost = unitCost * item.quantity;
      productCost += lineCost;
      costLines.push({
        itemId: item.itemId,
        modelId: item.modelId,
        skuCode: item.skuCode,
        quantity: item.quantity,
        erpSkuId: mappedSku?.id,
        erpSkuCode: mappedSku?.skuCode,
        unitCost: unitCost.toFixed(2),
        lineCost: lineCost.toFixed(2),
      });
    }

    const revenue = this.decimalToNumber(order.totalAmount) || this.pickMoney(raw, [
      'total_amount',
      'order_total',
      'escrow_amount',
    ]);
    const platformFee = this.pickMoney(raw, [
      'commission_fee',
      'service_fee',
      'seller_transaction_fee',
      'transaction_fee',
      'platform_fee',
    ]);
    const logisticsFee = this.pickMoney(raw, [
      'actual_shipping_fee',
      'estimated_shipping_fee',
      'reverse_shipping_fee',
      'buyer_paid_shipping_fee',
    ]);
    const otherFee = this.pickMoney(raw, ['voucher_from_seller', 'seller_coin_cash_back']);
    const grossProfit = revenue - productCost - platformFee - logisticsFee - otherFee;
    const grossMarginRate = revenue > 0 ? grossProfit / revenue : undefined;

    await this.prismaService.erpOrderFinanceSnapshot.upsert({
      where: { shopId_orderSn: { shopId: order.shopId, orderSn: order.orderSn } },
      update: {
        currency: order.currency ?? this.optionalString(raw.currency) ?? 'BRL',
        revenue: this.decimal(revenue),
        productCost: this.decimal(productCost),
        platformFee: this.decimal(platformFee),
        logisticsFee: this.decimal(logisticsFee),
        otherFee: this.decimal(otherFee),
        grossProfit: this.decimal(grossProfit),
        grossMarginRate:
          grossMarginRate === undefined ? undefined : this.decimal(grossMarginRate),
        estimated: missingCost || platformFee === 0 || logisticsFee === 0,
        missingCost,
        detail: this.toJson({
          costLines,
          rawFeeFields: {
            platformFee,
            logisticsFee,
            otherFee,
          },
        }),
        calculatedAt: new Date(),
      },
      create: {
        shopId: order.shopId,
        orderSn: order.orderSn,
        currency: order.currency ?? this.optionalString(raw.currency) ?? 'BRL',
        revenue: this.decimal(revenue),
        productCost: this.decimal(productCost),
        platformFee: this.decimal(platformFee),
        logisticsFee: this.decimal(logisticsFee),
        otherFee: this.decimal(otherFee),
        grossProfit: this.decimal(grossProfit),
        grossMarginRate:
          grossMarginRate === undefined ? undefined : this.decimal(grossMarginRate),
        estimated: missingCost || platformFee === 0 || logisticsFee === 0,
        missingCost,
        detail: this.toJson({ costLines }),
      },
    });
  }

  private async findMappedSku(
    shopId: string,
    item: { itemId: string; modelId?: string; skuCode?: string },
  ) {
    const identities: Prisma.ErpPlatformSkuWhereInput[] = [];
    if (item.modelId) identities.push({ modelId: item.modelId });
    if (item.skuCode) identities.push({ skuCode: item.skuCode });

    const platformSku = await this.prismaService.erpPlatformSku.findFirst({
      where: {
        platformProduct: {
          platform: 'SHOPEE',
          shopId,
          itemId: item.itemId,
        },
        ...(identities.length ? { OR: identities } : {}),
        skuId: { not: null },
      },
      include: { sku: true },
    });

    return platformSku?.sku;
  }

  private collectOrderItems(raw: Record<string, unknown>) {
    const items = [
      ...this.arrayRecords(raw.item_list),
      ...this.arrayRecords(raw.itemList),
      ...this.arrayRecords(raw.package_list).flatMap((pkg) => [
        ...this.arrayRecords(pkg.item_list),
        ...this.arrayRecords(pkg.itemList),
      ]),
    ];

    const candidates: Array<{
      itemId?: string;
      modelId?: string;
      skuCode?: string;
      quantity: number;
    }> = items.map((item) => ({
      itemId: this.optionalString(item.item_id ?? item.itemId),
      modelId: this.optionalString(item.model_id ?? item.modelId),
      skuCode: this.optionalString(item.model_sku ?? item.item_sku ?? item.sku),
      quantity:
        this.optionalNumber(item.model_quantity_purchased) ??
        this.optionalNumber(item.model_quantity) ??
        this.optionalNumber(item.quantity) ??
        1,
    }));

    return candidates.filter((item): item is {
        itemId: string;
        modelId?: string;
        skuCode?: string;
        quantity: number;
      } => Boolean(item.itemId));
  }

  private buildSnapshotWhere(query: ErpFinanceQueryDto) {
    const where: Prisma.ErpOrderFinanceSnapshotWhereInput = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.keyword
        ? {
            OR: [
              { orderSn: { contains: query.keyword, mode: 'insensitive' } },
              { shopId: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (query.startDate || query.endDate) {
      where.calculatedAt = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    return where;
  }

  private pickMoney(raw: Record<string, unknown>, keys: string[]) {
    let total = 0;
    for (const key of keys) {
      total += this.optionalNumber(raw[key]) ?? 0;
    }

    const paymentInfo = this.asRecord(raw.payment_info);
    for (const key of keys) {
      total += this.optionalNumber(paymentInfo[key]) ?? 0;
    }

    return total;
  }

  private toSnapshotItem(item: {
    id: string;
    shopId: string;
    orderSn: string;
    currency: string;
    revenue: Prisma.Decimal;
    productCost: Prisma.Decimal;
    platformFee: Prisma.Decimal;
    logisticsFee: Prisma.Decimal;
    otherFee: Prisma.Decimal;
    grossProfit: Prisma.Decimal;
    grossMarginRate: Prisma.Decimal | null;
    estimated: boolean;
    missingCost: boolean;
    calculatedAt: Date;
  }) {
    return {
      id: item.id,
      shopId: item.shopId,
      orderSn: item.orderSn,
      currency: item.currency,
      revenue: item.revenue.toString(),
      productCost: item.productCost.toString(),
      platformFee: item.platformFee.toString(),
      logisticsFee: item.logisticsFee.toString(),
      otherFee: item.otherFee.toString(),
      grossProfit: item.grossProfit.toString(),
      grossMarginRate: item.grossMarginRate?.toString(),
      estimated: item.estimated,
      missingCost: item.missingCost,
      calculatedAt: item.calculatedAt.toISOString(),
    };
  }

  private decimal(value: number) {
    return new Prisma.Decimal(value.toFixed(4));
  }

  private decimalToNumber(value?: Prisma.Decimal | null) {
    return value ? Number(value.toString()) : 0;
  }

  private optionalString(value: unknown) {
    return value === undefined || value === null || value === '' ? undefined : String(value);
  }

  private optionalNumber(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private arrayRecords(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value)
      ? value.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item && typeof item === 'object' && !Array.isArray(item)),
        )
      : [];
  }

  private toJson(input: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
  }
}
