import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ErpInventoryMovementType,
  ErpPurchaseItemStatus,
  ErpPurchaseOrderStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';

import {
  CreateErpPurchaseOrderDto,
  CreateErpSupplierDto,
  ErpPurchaseQueryDto,
  ErpSupplierQueryDto,
  ReceiveErpPurchaseOrderDto,
} from './dto/erp-purchase.dto';

@Injectable()
export class ErpPurchasesService {
  constructor(private readonly prismaService: PrismaService) {}

  async listSuppliers(query: ErpSupplierQueryDto) {
    const suppliers = await this.prismaService.erpSupplier.findMany({
      where: query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' } },
              { name: { contains: query.keyword, mode: 'insensitive' } },
              { contactName: { contains: query.keyword, mode: 'insensitive' } },
              { phone: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    return { success: true, data: suppliers, total: suppliers.length };
  }

  async createSupplier(payload: CreateErpSupplierDto) {
    const supplier = await this.prismaService.erpSupplier.create({
      data: {
        code: payload.code,
        name: payload.name,
        contactName: payload.contactName,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        taxId: payload.taxId,
        currency: payload.currency ?? 'BRL',
        active: payload.active ?? true,
        remark: payload.remark,
        raw: this.toJson(payload),
      },
    });

    return { success: true, data: supplier };
  }

  async listPurchaseOrders(query: ErpPurchaseQueryDto) {
    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ErpPurchaseOrderWhereInput = {
      ...(this.isOrderStatus(query.status) ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.keyword
        ? {
            OR: [
              { orderNo: { contains: query.keyword, mode: 'insensitive' } },
              { supplier: { name: { contains: query.keyword, mode: 'insensitive' } } },
              {
                items: {
                  some: {
                    OR: [
                      {
                        skuCodeSnapshot: {
                          contains: query.keyword,
                          mode: 'insensitive',
                        },
                      },
                      {
                        productTitle: {
                          contains: query.keyword,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.erpPurchaseOrder.count({ where }),
      this.prismaService.erpPurchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          warehouse: true,
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: data.map((order) => this.toOrderListItem(order)),
      total,
      current,
      pageSize,
    };
  }

  async getPurchaseOrder(orderId: string) {
    const order = await this.prismaService.erpPurchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            sku: { include: { product: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found.');
    }

    return { success: true, data: this.toOrderDetail(order) };
  }

  async createPurchaseOrder(payload: CreateErpPurchaseOrderDto) {
    const skuIds = payload.items.map((item) => item.skuId);
    const [supplier, warehouse, skus] = await Promise.all([
      this.prismaService.erpSupplier.findUnique({ where: { id: payload.supplierId } }),
      payload.warehouseId
        ? this.prismaService.erpWarehouse.findUnique({ where: { id: payload.warehouseId } })
        : Promise.resolve(null),
      this.prismaService.erpSku.findMany({
        where: { id: { in: skuIds } },
        include: { product: true },
      }),
    ]);

    if (!supplier) throw new NotFoundException('ERP supplier not found.');
    if (payload.warehouseId && !warehouse) {
      throw new NotFoundException('ERP warehouse not found.');
    }

    const skuMap = new Map(skus.map((sku) => [sku.id, sku]));
    for (const item of payload.items) {
      if (!skuMap.has(item.skuId)) {
        throw new NotFoundException(`ERP SKU not found: ${item.skuId}`);
      }
    }

    const orderNo = await this.nextOrderNo();
    const totalAmount = payload.items.reduce((sum, item) => {
      return sum + item.quantity * (item.unitCost ?? 0);
    }, 0);

    const order = await this.prismaService.erpPurchaseOrder.create({
      data: {
        orderNo,
        supplierId: payload.supplierId,
        warehouseId: payload.warehouseId,
        status: ErpPurchaseOrderStatus.SUBMITTED,
        currency: payload.currency ?? supplier.currency ?? 'BRL',
        totalAmount: this.optionalDecimal(totalAmount),
        expectedArriveAt: payload.expectedArriveAt
          ? new Date(payload.expectedArriveAt)
          : undefined,
        submittedAt: new Date(),
        remark: payload.remark,
        items: {
          create: payload.items.map((item) => {
            const sku = skuMap.get(item.skuId)!;
            const totalCost = item.quantity * (item.unitCost ?? 0);
            return {
              skuId: item.skuId,
              skuCodeSnapshot: sku.skuCode,
              productTitle: sku.product.title,
              quantity: item.quantity,
              unitCost: this.optionalDecimal(item.unitCost),
              totalCost: this.optionalDecimal(totalCost),
              remark: item.remark,
            };
          }),
        },
      },
      include: { supplier: true, warehouse: true, items: true },
    });

    return { success: true, data: this.toOrderListItem(order) };
  }

  async receivePurchaseOrder(orderId: string, payload: ReceiveErpPurchaseOrderDto) {
    const result = await this.prismaService.$transaction(async (tx) => {
      const order = await tx.erpPurchaseOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw new NotFoundException('Purchase order not found.');
      if (order.status === ErpPurchaseOrderStatus.CANCELLED) {
        throw new BadRequestException('Cancelled purchase orders cannot be received.');
      }

      const warehouse = await tx.erpWarehouse.findUnique({
        where: { id: payload.warehouseId },
        select: { id: true },
      });
      if (!warehouse) throw new NotFoundException('ERP warehouse not found.');

      const itemMap = new Map(order.items.map((item) => [item.id, item]));

      for (const input of payload.items) {
        const item = itemMap.get(input.itemId);
        if (!item) throw new NotFoundException(`Purchase item not found: ${input.itemId}`);
        const remaining = item.quantity - item.receivedQuantity;
        if (input.quantity > remaining) {
          throw new BadRequestException('Receive quantity exceeds remaining quantity.');
        }

        const balance = await this.getOrCreateBalance(tx, payload.warehouseId, item.skuId);
        const nextOnHand = balance.onHand + input.quantity;
        const updatedBalance = await tx.erpInventoryBalance.update({
          where: { id: balance.id },
          data: {
            onHand: nextOnHand,
            salable: this.calculateSalable(nextOnHand, balance.locked, balance.safetyStock),
          },
        });

        await tx.erpInventoryLedger.create({
          data: {
            warehouseId: payload.warehouseId,
            skuId: item.skuId,
            movementType: ErpInventoryMovementType.PURCHASE_IN,
            quantity: input.quantity,
            beforeOnHand: balance.onHand,
            afterOnHand: updatedBalance.onHand,
            beforeLocked: balance.locked,
            afterLocked: updatedBalance.locked,
            referenceType: 'purchase_order',
            referenceId: order.id,
            note: payload.note,
          },
        });

        const receivedQuantity = item.receivedQuantity + input.quantity;
        await tx.erpPurchaseOrderItem.update({
          where: { id: item.id },
          data: {
            receivedQuantity,
            status:
              receivedQuantity >= item.quantity
                ? ErpPurchaseItemStatus.RECEIVED
                : ErpPurchaseItemStatus.PARTIALLY_RECEIVED,
          },
        });
      }

      const refreshedItems = await tx.erpPurchaseOrderItem.findMany({
        where: { purchaseOrderId: order.id },
      });
      const allReceived = refreshedItems.every(
        (item) => item.receivedQuantity >= item.quantity,
      );
      const anyReceived = refreshedItems.some((item) => item.receivedQuantity > 0);

      return tx.erpPurchaseOrder.update({
        where: { id: order.id },
        data: {
          warehouseId: payload.warehouseId,
          status: allReceived
            ? ErpPurchaseOrderStatus.RECEIVED
            : anyReceived
              ? ErpPurchaseOrderStatus.PARTIALLY_RECEIVED
              : order.status,
          receivedAt: allReceived ? new Date() : order.receivedAt,
        },
        include: { supplier: true, warehouse: true, items: true },
      });
    });

    return { success: true, data: this.toOrderListItem(result) };
  }

  private async nextOrderNo() {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const prefix = `PO-${yyyy}${mm}${dd}`;
    const count = await this.prismaService.erpPurchaseOrder.count({
      where: { orderNo: { startsWith: prefix } },
    });
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  private async getOrCreateBalance(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    skuId: string,
  ) {
    const existing = await tx.erpInventoryBalance.findUnique({
      where: { warehouseId_skuId: { warehouseId, skuId } },
    });
    if (existing) return existing;
    return tx.erpInventoryBalance.create({ data: { warehouseId, skuId } });
  }

  private calculateSalable(onHand: number, locked: number, safetyStock: number) {
    return Math.max(0, onHand - locked - safetyStock);
  }

  private isOrderStatus(value?: string): value is ErpPurchaseOrderStatus {
    return Boolean(value && value in ErpPurchaseOrderStatus);
  }

  private optionalDecimal(value?: number) {
    return value === undefined || value === null
      ? undefined
      : new Prisma.Decimal(String(value));
  }

  private toJson(input: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
  }

  private toOrderListItem(order: {
    id: string;
    orderNo: string;
    supplierId: string;
    warehouseId: string | null;
    status: ErpPurchaseOrderStatus;
    currency: string;
    totalAmount: Prisma.Decimal | null;
    expectedArriveAt: Date | null;
    submittedAt: Date | null;
    receivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    remark: string | null;
    supplier: { id: string; code: string; name: string };
    warehouse: { id: string; code: string; name: string } | null;
    items: Array<{ quantity: number; receivedQuantity: number }>;
  }) {
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const receivedQuantity = order.items.reduce(
      (sum, item) => sum + item.receivedQuantity,
      0,
    );
    return {
      id: order.id,
      orderNo: order.orderNo,
      supplierId: order.supplierId,
      supplierName: order.supplier.name,
      warehouseId: order.warehouseId,
      warehouseName: order.warehouse?.name,
      status: order.status,
      currency: order.currency,
      totalAmount: order.totalAmount?.toString(),
      itemCount: order.items.length,
      totalQuantity,
      receivedQuantity,
      expectedArriveAt: order.expectedArriveAt?.toISOString(),
      submittedAt: order.submittedAt?.toISOString(),
      receivedAt: order.receivedAt?.toISOString(),
      remark: order.remark,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private toOrderDetail(order: {
    id: string;
    orderNo: string;
    supplierId: string;
    warehouseId: string | null;
    status: ErpPurchaseOrderStatus;
    currency: string;
    totalAmount: Prisma.Decimal | null;
    expectedArriveAt: Date | null;
    submittedAt: Date | null;
    receivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    remark: string | null;
    supplier: { id: string; code: string; name: string };
    warehouse: { id: string; code: string; name: string } | null;
    items: Array<{
      id: string;
      skuId: string;
      skuCodeSnapshot: string;
      productTitle: string | null;
      quantity: number;
      receivedQuantity: number;
      unitCost: Prisma.Decimal | null;
      totalCost: Prisma.Decimal | null;
      status: ErpPurchaseItemStatus;
      remark: string | null;
      sku: { product: { title: string } };
    }>;
  }) {
    return {
      ...this.toOrderListItem(order),
      items: order.items.map((item) => ({
        id: item.id,
        skuId: item.skuId,
        skuCode: item.skuCodeSnapshot,
        productTitle: item.productTitle ?? item.sku.product.title,
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
        unitCost: item.unitCost?.toString(),
        totalCost: item.totalCost?.toString(),
        status: item.status,
        remark: item.remark,
      })),
    };
  }
}
