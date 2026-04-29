import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ErpInventoryMovementType,
  ErpInventoryReservationStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';

import {
  AdjustInventoryDto,
  CreateErpWarehouseDto,
  ErpInventoryQueryDto,
  ReleaseInventoryDto,
  ReserveInventoryDto,
} from './dto/erp-inventory.dto';

@Injectable()
export class ErpInventoryService {
  constructor(private readonly prismaService: PrismaService) {}

  async listWarehouses() {
    const warehouses = await this.prismaService.erpWarehouse.findMany({
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    return {
      success: true,
      data: warehouses,
      total: warehouses.length,
    };
  }

  async createWarehouse(payload: CreateErpWarehouseDto) {
    const warehouse = await this.prismaService.erpWarehouse.create({
      data: {
        code: payload.code,
        name: payload.name,
        region: payload.region,
        address: payload.address,
        contactName: payload.contactName,
        contactPhone: payload.contactPhone,
        active: payload.active ?? true,
      },
    });

    return { success: true, data: warehouse };
  }

  async listBalances(query: ErpInventoryQueryDto) {
    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ErpInventoryBalanceWhereInput = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.keyword
        ? {
            sku: {
              OR: [
                { skuCode: { contains: query.keyword, mode: 'insensitive' } },
                { barcode: { contains: query.keyword, mode: 'insensitive' } },
                {
                  product: {
                    title: { contains: query.keyword, mode: 'insensitive' },
                  },
                },
              ],
            },
          }
        : {}),
    };

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.erpInventoryBalance.count({ where }),
      this.prismaService.erpInventoryBalance.findMany({
        where,
        include: {
          warehouse: true,
          sku: { include: { product: true } },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: data.map((item) => this.toBalanceItem(item)),
      total,
      current,
      pageSize,
    };
  }

  async adjustStock(payload: AdjustInventoryDto) {
    const movementType = this.resolveMovementType(payload.movementType);
    const result = await this.prismaService.$transaction(async (tx) => {
      await this.ensureWarehouseAndSku(tx, payload.warehouseId, payload.skuId);
      const balance = await this.getOrCreateBalance(tx, payload.warehouseId, payload.skuId);
      const nextOnHand = balance.onHand + payload.quantity;
      const nextSafetyStock = payload.safetyStock ?? balance.safetyStock;

      if (nextOnHand < 0) {
        throw new BadRequestException('Inventory on hand cannot be negative.');
      }
      if (nextOnHand < balance.locked) {
        throw new BadRequestException('Inventory on hand cannot be below locked quantity.');
      }

      const updated = await tx.erpInventoryBalance.update({
        where: { id: balance.id },
        data: {
          onHand: nextOnHand,
          safetyStock: nextSafetyStock,
          salable: this.calculateSalable(nextOnHand, balance.locked, nextSafetyStock),
        },
        include: { warehouse: true, sku: { include: { product: true } } },
      });

      await tx.erpInventoryLedger.create({
        data: {
          warehouseId: payload.warehouseId,
          skuId: payload.skuId,
          movementType,
          quantity: payload.quantity,
          beforeOnHand: balance.onHand,
          afterOnHand: updated.onHand,
          beforeLocked: balance.locked,
          afterLocked: updated.locked,
          referenceType: payload.referenceType,
          referenceId: payload.referenceId,
          note: payload.note,
        },
      });

      return updated;
    });

    return { success: true, data: this.toBalanceItem(result) };
  }

  async reserveStock(payload: ReserveInventoryDto) {
    const result = await this.prismaService.$transaction(async (tx) => {
      await this.ensureWarehouseAndSku(tx, payload.warehouseId, payload.skuId);
      const balance = await this.getOrCreateBalance(tx, payload.warehouseId, payload.skuId);
      const salable = this.calculateSalable(
        balance.onHand,
        balance.locked,
        balance.safetyStock,
      );

      if (salable < payload.quantity) {
        throw new BadRequestException('Insufficient salable inventory.');
      }

      const nextLocked = balance.locked + payload.quantity;
      const updated = await tx.erpInventoryBalance.update({
        where: { id: balance.id },
        data: {
          locked: nextLocked,
          salable: this.calculateSalable(balance.onHand, nextLocked, balance.safetyStock),
        },
        include: { warehouse: true, sku: { include: { product: true } } },
      });

      const reservation = await tx.erpInventoryReservation.create({
        data: {
          warehouseId: payload.warehouseId,
          skuId: payload.skuId,
          orderSn: payload.orderSn,
          quantity: payload.quantity,
          status: ErpInventoryReservationStatus.LOCKED,
          note: payload.note,
        },
      });

      await tx.erpInventoryLedger.create({
        data: {
          warehouseId: payload.warehouseId,
          skuId: payload.skuId,
          movementType: ErpInventoryMovementType.SALE_LOCK,
          quantity: payload.quantity,
          beforeOnHand: balance.onHand,
          afterOnHand: updated.onHand,
          beforeLocked: balance.locked,
          afterLocked: updated.locked,
          referenceType: 'reservation',
          referenceId: reservation.id,
          orderSn: payload.orderSn,
          note: payload.note,
        },
      });

      return { balance: updated, reservation };
    });

    return {
      success: true,
      data: {
        balance: this.toBalanceItem(result.balance),
        reservation: result.reservation,
      },
    };
  }

  async releaseReservation(payload: ReleaseInventoryDto) {
    const result = await this.prismaService.$transaction(async (tx) => {
      const reservation = await tx.erpInventoryReservation.findUnique({
        where: { id: payload.reservationId },
      });
      if (!reservation) {
        throw new NotFoundException('Inventory reservation not found.');
      }
      if (reservation.status !== ErpInventoryReservationStatus.LOCKED) {
        throw new BadRequestException('Only locked reservations can be released.');
      }

      const balance = await this.getOrCreateBalance(
        tx,
        reservation.warehouseId,
        reservation.skuId,
      );
      const nextLocked = Math.max(0, balance.locked - reservation.quantity);
      const updated = await tx.erpInventoryBalance.update({
        where: { id: balance.id },
        data: {
          locked: nextLocked,
          salable: this.calculateSalable(balance.onHand, nextLocked, balance.safetyStock),
        },
        include: { warehouse: true, sku: { include: { product: true } } },
      });

      const released = await tx.erpInventoryReservation.update({
        where: { id: reservation.id },
        data: {
          status: ErpInventoryReservationStatus.RELEASED,
          releasedAt: new Date(),
          note: payload.note ?? reservation.note,
        },
      });

      await tx.erpInventoryLedger.create({
        data: {
          warehouseId: reservation.warehouseId,
          skuId: reservation.skuId,
          movementType: ErpInventoryMovementType.SALE_RELEASE,
          quantity: reservation.quantity,
          beforeOnHand: balance.onHand,
          afterOnHand: updated.onHand,
          beforeLocked: balance.locked,
          afterLocked: updated.locked,
          referenceType: 'reservation',
          referenceId: reservation.id,
          orderSn: reservation.orderSn,
          note: payload.note,
        },
      });

      return { balance: updated, reservation: released };
    });

    return {
      success: true,
      data: {
        balance: this.toBalanceItem(result.balance),
        reservation: result.reservation,
      },
    };
  }

  private async ensureWarehouseAndSku(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    skuId: string,
  ) {
    const [warehouse, sku] = await Promise.all([
      tx.erpWarehouse.findUnique({ where: { id: warehouseId }, select: { id: true } }),
      tx.erpSku.findUnique({ where: { id: skuId }, select: { id: true } }),
    ]);
    if (!warehouse) throw new NotFoundException('ERP warehouse not found.');
    if (!sku) throw new NotFoundException('ERP SKU not found.');
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

    return tx.erpInventoryBalance.create({
      data: { warehouseId, skuId },
    });
  }

  private calculateSalable(onHand: number, locked: number, safetyStock: number) {
    return Math.max(0, onHand - locked - safetyStock);
  }

  private resolveMovementType(value?: string) {
    if (value && value in ErpInventoryMovementType) {
      return value as ErpInventoryMovementType;
    }
    return ErpInventoryMovementType.ADJUSTMENT;
  }

  private toBalanceItem(item: {
    id: string;
    warehouseId: string;
    skuId: string;
    onHand: number;
    locked: number;
    salable: number;
    safetyStock: number;
    updatedAt: Date;
    warehouse: { id: string; code: string; name: string };
    sku: {
      id: string;
      skuCode: string;
      barcode: string | null;
      stock: number;
      product: { id: string; title: string };
    };
  }) {
    return {
      id: item.id,
      warehouseId: item.warehouseId,
      warehouseCode: item.warehouse.code,
      warehouseName: item.warehouse.name,
      skuId: item.skuId,
      skuCode: item.sku.skuCode,
      barcode: item.sku.barcode,
      productId: item.sku.product.id,
      productTitle: item.sku.product.title,
      skuStock: item.sku.stock,
      onHand: item.onHand,
      locked: item.locked,
      salable: item.salable,
      safetyStock: item.safetyStock,
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
