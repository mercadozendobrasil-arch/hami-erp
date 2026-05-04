import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ErpPlatformPublishStatus,
  ErpProductStatus,
  JobStatus,
  Prisma,
} from '@prisma/client';

import { ShopeeTokenService } from 'src/common/shopee-token.service';
import { PrismaService } from 'src/infra/database/prisma.service';
import { ProductSdk } from 'src/shopee-sdk/modules/product.sdk';

import {
  BindErpSkuMappingDto,
  CreateErpProductDto,
  UpdateOnlineErpProductDto,
} from './dto/erp-product.dto';
import { ErpProductQueryDto, ErpSkuQueryDto } from './dto/erp-product-query.dto';

@Injectable()
export class ErpProductsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly shopeeTokenService: ShopeeTokenService,
    private readonly productSdk: ProductSdk,
  ) {}

  async listProducts(query: ErpProductQueryDto) {
    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 20;
    if (query.shopId) {
      await this.ensureRemoteProductsImported(query.shopId);
    }

    const where: Prisma.ErpProductWhereInput = {
      ...(query.title ? { title: { contains: query.title, mode: 'insensitive' } } : {}),
      ...(this.isProductStatus(query.status)
        ? { status: query.status }
        : {}),
      ...(query.shopId
        ? {
            platformProducts: {
              some: { shopId: query.shopId },
            },
          }
        : {}),
    };

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.erpProduct.count({ where }),
      this.prismaService.erpProduct.findMany({
        where,
        include: {
          skus: true,
          platformProducts: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: data.map((item) => this.toListItem(item)),
      total,
      current,
      pageSize,
    };
  }

  async syncRemoteProducts(shopIdRaw: string) {
    const synced = await this.importRemoteProducts(shopIdRaw, true);

    return {
      success: true,
      data: {
        shopId: shopIdRaw,
        synced,
      },
    };
  }

  async getProduct(productId: string, shopId?: string) {
    const product = await this.prismaService.erpProduct.findUnique({
      where: { id: productId },
      include: {
        skus: true,
        platformProducts: {
          where: shopId ? { shopId } : undefined,
          include: { skus: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('ERP product not found.');
    }

    return {
      success: true,
      data: {
        ...this.toListItem(product),
        description: product.description,
        skus: product.skus.map((sku) => ({
          id: sku.id,
          skuCode: sku.skuCode,
          barcode: sku.barcode,
          optionName: sku.optionName,
          optionValue: sku.optionValue,
          status: sku.status,
          price: sku.price?.toString(),
          costPrice: sku.costPrice?.toString(),
          stock: sku.stock,
        })),
        platformProducts: product.platformProducts.map((binding) => ({
          id: binding.id,
          platform: binding.platform,
          shopId: binding.shopId,
          itemId: binding.itemId,
          publishStatus: binding.publishStatus,
          lastSyncedAt: binding.lastSyncedAt?.toISOString(),
        })),
      },
    };
  }

  async getOnlineProduct(productId: string, shopIdRaw: string) {
    if (!shopIdRaw) {
      throw new NotFoundException('Shopee shop id is required.');
    }

    const product = await this.prismaService.erpProduct.findUnique({
      where: { id: productId },
      include: {
        skus: true,
        platformProducts: {
          where: { shopId: shopIdRaw },
          include: { skus: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('ERP product not found.');
    }

    const platformProduct = product.platformProducts[0];
    if (!platformProduct?.itemId) {
      throw new NotFoundException('Shopee item binding not found for this product.');
    }

    const shopId = BigInt(shopIdRaw);
    const { token } =
      await this.shopeeTokenService.findRequiredTokenByShopId(shopId);
    const context = {
      shopId: Number(shopId),
      accessToken: token.accessToken,
    };
    const itemId = Number(platformProduct.itemId);

    const [baseInfo, extraInfo, modelInfo] = await Promise.all([
      this.productSdk.getItemBaseInfo(context, [itemId]),
      this.productSdk.getItemExtraInfo(context, [itemId]),
      this.productSdk.getModelList(context, itemId),
    ]);

    const baseItem =
      this.arrayRecords((baseInfo as Record<string, unknown>).item_list)[0] ??
      {};
    const extraItem =
      this.arrayRecords((extraInfo as Record<string, unknown>).item_list)[0] ??
      {};
    const modelList = this.arrayRecords(
      (modelInfo as Record<string, unknown>).model ??
        (modelInfo as Record<string, unknown>).model_list,
    );
    const remote = { ...extraItem, ...baseItem };

    return {
      success: true,
      data: {
        ...this.toListItem(product),
        description:
          this.optionalString(remote.description) ?? product.description ?? '',
        category: {
          categoryId: this.optionalString(
            remote.category_id ?? remote.categoryId,
          ),
          name: this.optionalString(
            remote.category_name ??
              remote.categoryName ??
              this.asRecord(remote.category).display_name,
          ),
        },
        brand: this.asRecord(remote.brand),
        attributes: this.arrayRecords(
          remote.attribute_list ??
            remote.attributeList ??
            remote.attributes ??
            remote.attribute,
        ),
        images: this.normalizeShopeeImages(remote),
        videos: this.normalizeShopeeVideos(remote),
        logistics: this.arrayRecords(
          remote.logistic_info ??
            remote.logisticInfo ??
            remote.logistics ??
            remote.logistic_list,
        ),
        tax: this.asRecord(remote.tax_info ?? remote.taxInfo),
        package: {
          weight: this.optionalNumber(remote.weight),
          dimension: this.asRecord(remote.dimension),
        },
        models: modelList,
        skus: product.skus.map((sku) => ({
          id: sku.id,
          skuCode: sku.skuCode,
          barcode: sku.barcode,
          optionName: sku.optionName,
          optionValue: sku.optionValue,
          status: sku.status,
          price: sku.price?.toString(),
          costPrice: sku.costPrice?.toString(),
          stock: sku.stock,
        })),
        platformProducts: product.platformProducts.map((binding) => ({
          id: binding.id,
          platform: binding.platform,
          shopId: binding.shopId,
          itemId: binding.itemId,
          publishStatus: binding.publishStatus,
          lastSyncedAt: binding.lastSyncedAt?.toISOString(),
        })),
        raw: {
          baseInfo: baseItem,
          extraInfo: extraItem,
          modelInfo,
        },
      },
    };
  }

  async createProduct(payload: CreateErpProductDto) {
    const product = await this.prismaService.erpProduct.create({
      data: {
        title: payload.title,
        description: payload.description,
        categoryName: payload.categoryName,
        brand: payload.brand,
        parentSku: payload.parentSku,
        currency: payload.currency ?? 'BRL',
        price: this.optionalDecimal(payload.price),
        costPrice: this.optionalDecimal(payload.costPrice),
        weightKg: this.optionalDecimal(payload.weightKg),
        widthCm: this.optionalDecimal(payload.widthCm),
        lengthCm: this.optionalDecimal(payload.lengthCm),
        heightCm: this.optionalDecimal(payload.heightCm),
        defaultImageUrl: payload.defaultImageUrl,
        sourceUrl: payload.sourceUrl,
        skus: {
          create: this.resolveSkuInputs(payload).map((sku) => ({
            skuCode: sku.skuCode,
            barcode: sku.barcode,
            optionName: sku.optionName,
            optionValue: sku.optionValue,
            price: this.optionalDecimal(sku.price ?? payload.price),
            costPrice: this.optionalDecimal(sku.costPrice ?? payload.costPrice),
            stock: sku.stock ?? 0,
          })),
        },
        platformProducts: payload.shopId
          ? {
              create: {
                platform: 'SHOPEE',
                shopId: payload.shopId,
                publishStatus: ErpPlatformPublishStatus.UNBOUND,
                title: payload.title,
              },
            }
          : undefined,
        raw: this.toJson(payload),
      },
      include: {
        skus: true,
        platformProducts: true,
      },
    });

    await this.recordMappingLog({
      productId: product.id,
      shopId: payload.shopId,
      action: 'CREATE_LOCAL_PRODUCT',
      status: 'SUCCESS',
      request: payload,
      response: { productId: product.id },
    });

    return {
      success: true,
      data: this.toListItem(product),
    };
  }

  async listMissingSkuMappings(query: {
    shopId?: string;
    current?: number;
    pageSize?: number;
  }) {
    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 20;
    const projections = await this.prismaService.erpOrderProjection.findMany({
      where: query.shopId ? { shopId: query.shopId } : {},
      select: {
        shopId: true,
        orderSn: true,
        buyerUsername: true,
        raw: true,
        updateTime: true,
        updatedAt: true,
      },
      orderBy: [{ updateTime: 'desc' }, { updatedAt: 'desc' }],
      take: 500,
    });

    const candidates = this.collectOrderSkuCandidates(projections);
    const missing = [];

    for (const candidate of candidates) {
      const platformSkuIdentity: Prisma.ErpPlatformSkuWhereInput[] = [];
      if (candidate.modelId) {
        platformSkuIdentity.push({ modelId: candidate.modelId });
      }
      if (candidate.platformSkuId) {
        platformSkuIdentity.push({ platformSkuId: candidate.platformSkuId });
      }
      if (candidate.platformSkuCode) {
        platformSkuIdentity.push({ skuCode: candidate.platformSkuCode });
      }

      const existing = await this.prismaService.erpPlatformSku.findFirst({
        where: {
          platformProduct: {
            platform: 'SHOPEE',
            shopId: candidate.shopId,
            itemId: candidate.itemId,
          },
          ...(platformSkuIdentity.length ? { OR: platformSkuIdentity } : {}),
          skuId: { not: null },
        },
        select: { id: true },
      });

      if (!existing) {
        missing.push(candidate);
      }
    }

    const start = (current - 1) * pageSize;
    const page = missing.slice(start, start + pageSize);

    return {
      success: true,
      data: page,
      total: missing.length,
      current,
      pageSize,
    };
  }

  async bindSkuMapping(payload: BindErpSkuMappingDto) {
    const sku = await this.prismaService.erpSku.findUnique({
      where: { id: payload.skuId },
      include: { product: true },
    });

    if (!sku) {
      throw new NotFoundException('ERP SKU not found.');
    }

    const platformProduct = await this.prismaService.erpPlatformProduct.upsert({
      where: {
        platform_shopId_itemId: {
          platform: 'SHOPEE',
          shopId: payload.shopId,
          itemId: payload.itemId,
        },
      },
      update: {
        productId: sku.productId,
        publishStatus: ErpPlatformPublishStatus.ACTIVE,
        title: sku.product.title,
      },
      create: {
        productId: sku.productId,
        platform: 'SHOPEE',
        shopId: payload.shopId,
        itemId: payload.itemId,
        publishStatus: ErpPlatformPublishStatus.ACTIVE,
        title: sku.product.title,
      },
    });

    const platformSkuIdentity: Prisma.ErpPlatformSkuWhereInput[] = [];
    if (payload.modelId) platformSkuIdentity.push({ modelId: payload.modelId });
    if (payload.platformSkuId) {
      platformSkuIdentity.push({ platformSkuId: payload.platformSkuId });
    }
    if (payload.skuCode) platformSkuIdentity.push({ skuCode: payload.skuCode });

    const existingPlatformSku = await this.prismaService.erpPlatformSku.findFirst({
      where: {
        platformProductId: platformProduct.id,
        ...(platformSkuIdentity.length ? { OR: platformSkuIdentity } : {}),
      },
    });

    const platformSku = existingPlatformSku
      ? await this.prismaService.erpPlatformSku.update({
          where: { id: existingPlatformSku.id },
          data: {
            skuId: sku.id,
            platformSkuId: payload.platformSkuId,
            modelId: payload.modelId,
            skuCode: payload.skuCode ?? sku.skuCode,
            price: sku.price,
            stock: sku.stock,
            syncStatus: 'MAPPED',
          },
        })
      : await this.prismaService.erpPlatformSku.create({
          data: {
            platformProductId: platformProduct.id,
            skuId: sku.id,
            platformSkuId: payload.platformSkuId,
            modelId: payload.modelId,
            skuCode: payload.skuCode ?? sku.skuCode,
            price: sku.price,
            stock: sku.stock,
            syncStatus: 'MAPPED',
          },
        });

    await this.recordMappingLog({
      productId: sku.productId,
      skuId: sku.id,
      shopId: payload.shopId,
      itemId: payload.itemId,
      modelId: payload.modelId,
      action: 'BIND_PLATFORM_SKU',
      status: 'SUCCESS',
      request: payload,
      response: { platformProductId: platformProduct.id, platformSkuId: platformSku.id },
    });

    return {
      success: true,
      data: {
        platformProductId: platformProduct.id,
        platformSkuId: platformSku.id,
        productId: sku.productId,
        skuId: sku.id,
      },
    };
  }

  async listSkus(query: ErpSkuQueryDto) {
    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ErpSkuWhereInput = query.keyword
      ? {
          OR: [
            { skuCode: { contains: query.keyword, mode: 'insensitive' } },
            { barcode: { contains: query.keyword, mode: 'insensitive' } },
            {
              product: {
                title: { contains: query.keyword, mode: 'insensitive' },
              },
            },
          ],
        }
      : {};

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.erpSku.count({ where }),
      this.prismaService.erpSku.findMany({
        where,
        include: { product: true },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: data.map((sku) => ({
        id: sku.id,
        skuId: sku.id,
        productId: sku.productId,
        productTitle: sku.product.title,
        skuCode: sku.skuCode,
        barcode: sku.barcode,
        optionName: sku.optionName,
        optionValue: sku.optionValue,
        status: sku.status,
        price: sku.price?.toString(),
        costPrice: sku.costPrice?.toString(),
        stock: sku.stock,
        updatedAt: sku.updatedAt.toISOString(),
      })),
      total,
      current,
      pageSize,
    };
  }

  async syncProduct(productId: string, shopId?: string) {
    const product = await this.prismaService.erpProduct.findUnique({
      where: { id: productId },
      include: { platformProducts: true },
    });

    if (!product) {
      throw new NotFoundException('ERP product not found.');
    }

    const job = await this.prismaService.jobRecord.create({
      data: {
        queueName: 'erp-products',
        jobName: 'sync-product-placeholder',
        status: JobStatus.PENDING,
        payload: this.toJson({ productId, shopId }),
        result: this.toJson({
          message: 'Product sync job placeholder created. Shopee publish/sync flow is not wired yet.',
        }),
      },
    });

    await this.recordMappingLog({
      productId,
      shopId,
      action: 'SYNC_LOCAL_PRODUCT',
      status: 'PENDING',
      response: { jobId: job.id },
    });

    return {
      success: true,
      data: {
        jobId: job.id,
        productId,
        status: job.status,
      },
    };
  }

  async updateOnlineProduct(productId: string, payload: UpdateOnlineErpProductDto) {
    const product = await this.prismaService.erpProduct.findUnique({
      where: { id: productId },
      include: {
        skus: true,
        platformProducts: {
          where: { shopId: payload.shopId },
          include: { skus: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('ERP product not found.');
    }

    const platformProduct = product.platformProducts[0];
    if (!platformProduct?.itemId) {
      throw new NotFoundException('Shopee item binding not found for this product.');
    }

    const shopId = BigInt(payload.shopId);
    const { token } =
      await this.shopeeTokenService.findRequiredTokenByShopId(shopId);
    const context = {
      shopId: Number(shopId),
      accessToken: token.accessToken,
    };
    const itemId = Number(platformProduct.itemId);
    const result: Record<string, unknown> = {};

    const itemPayload: Record<string, unknown> = {};
    if (payload.title !== undefined) itemPayload.itemName = payload.title;
    if (payload.description !== undefined) {
      itemPayload.description = payload.description;
    }

    if (Object.keys(itemPayload).length) {
      result.item = await this.productSdk.updateItem(context, itemId, itemPayload);
      this.assertShopeeActionOk(result.item, 'Update item');
    }

    const firstPlatformSku = platformProduct.skus[0];
    const modelId =
      this.optionalNumber(firstPlatformSku?.modelId) ??
      (payload.price !== undefined || payload.stock !== undefined
        ? await this.resolveFirstShopeeModelId(context, itemId)
        : undefined);
    if (payload.price !== undefined) {
      result.price = await this.productSdk.updatePrice(context, {
        itemId,
        models: [
          {
            modelId,
            originalPrice: payload.price,
          },
        ],
      });
      this.assertShopeeActionOk(result.price, 'Update price');
    }

    if (payload.stock !== undefined) {
      result.stock = await this.productSdk.updateStock(context, {
        itemId,
        models: [
          {
            modelId,
            sellerStock: payload.stock,
          },
        ],
      });
      this.assertShopeeActionOk(result.stock, 'Update stock');
    }

    const updated = await this.prismaService.erpProduct.update({
      where: { id: product.id },
      data: {
        title: payload.title ?? undefined,
        description: payload.description ?? undefined,
        price: this.optionalDecimal(payload.price),
        skus: product.skus[0]
          ? {
              update: {
                where: { id: product.skus[0].id },
                data: {
                  price: this.optionalDecimal(payload.price),
                  stock: payload.stock ?? undefined,
                },
              },
            }
          : payload.stock !== undefined || payload.price !== undefined
            ? {
                create: {
                  skuCode: product.parentSku ?? `SHOPEE-${payload.shopId}-${itemId}`,
                  price: this.optionalDecimal(payload.price),
                  stock: payload.stock ?? 0,
                },
              }
            : undefined,
        platformProducts: {
          update: {
            where: { id: platformProduct.id },
            data: {
              title: payload.title ?? undefined,
              raw: this.toJson({
                ...this.asRecord(platformProduct.raw),
                onlineUpdate: {
                  ...payload,
                  itemId,
                  updatedAt: new Date().toISOString(),
                },
              }),
              lastSyncedAt: new Date(),
            },
          },
        },
      },
      include: { skus: true, platformProducts: true },
    });

    await this.recordMappingLog({
      productId,
      shopId: payload.shopId,
      itemId: platformProduct.itemId,
      action: 'UPDATE_ONLINE_PRODUCT',
      status: 'SUCCESS',
      request: payload,
      response: result,
    });

    return {
      success: true,
      data: {
        ...this.toListItem(updated),
        result,
      },
    };
  }

  private async resolveFirstShopeeModelId(
    context: { shopId: number; accessToken: string },
    itemId: number,
  ) {
    const modelList = await this.productSdk.getModelList(context, itemId);
    const firstModel = this.arrayRecords(
      (modelList as Record<string, unknown>).model,
    )[0];

    return this.optionalNumber(firstModel?.model_id ?? firstModel?.modelId);
  }

  private assertShopeeActionOk(result: unknown, action: string) {
    const record = this.asRecord(result);
    const message = this.optionalString(record.message);
    if (
      record.success === false ||
      this.optionalString(record.error) ||
      message?.toLowerCase().includes('failed')
    ) {
      throw new BadRequestException(
        `${action} rejected by Shopee: ${message ?? record.error ?? JSON.stringify(result)}`,
      );
    }
  }

  async unlistProduct(productId: string, shopId?: string) {
    const product = await this.prismaService.erpProduct.update({
      where: { id: productId },
      data: {
        status: ErpProductStatus.INACTIVE,
        ...(shopId
          ? {
              platformProducts: {
                updateMany: {
                  where: { shopId },
                  data: { publishStatus: ErpPlatformPublishStatus.INACTIVE },
                },
              },
            }
          : {}),
      },
      include: {
        skus: true,
        platformProducts: true,
      },
    });

    await this.recordMappingLog({
      productId,
      shopId,
      action: 'UNLIST_LOCAL_PRODUCT',
      status: 'SUCCESS',
      response: { productId },
    });

    return {
      success: true,
      data: this.toListItem(product),
    };
  }

  async relistProduct(productId: string, shopId?: string) {
    const product = await this.prismaService.erpProduct.update({
      where: { id: productId },
      data: {
        status: ErpProductStatus.ACTIVE,
        ...(shopId
          ? {
              platformProducts: {
                updateMany: {
                  where: { shopId },
                  data: { publishStatus: ErpPlatformPublishStatus.ACTIVE },
                },
              },
            }
          : {}),
      },
      include: {
        skus: true,
        platformProducts: true,
      },
    });

    await this.recordMappingLog({
      productId,
      shopId,
      action: 'RELIST_LOCAL_PRODUCT',
      status: 'SUCCESS',
      response: { productId },
    });

    return {
      success: true,
      data: this.toListItem(product),
    };
  }

  private toListItem(product: {
    id: string;
    title: string;
    brand: string | null;
    status: ErpProductStatus;
    parentSku: string | null;
    price: Prisma.Decimal | null;
    defaultImageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    skus: Array<{ stock: number }>;
    platformProducts: Array<{
      shopId: string;
      itemId: string | null;
      publishStatus: ErpPlatformPublishStatus;
      lastSyncedAt: Date | null;
    }>;
  }) {
    const firstBinding = product.platformProducts[0];
    const stock = product.skus.reduce((sum, sku) => sum + sku.stock, 0);

    return {
      id: product.id,
      productId: product.id,
      platformProductId: firstBinding?.itemId ?? product.id,
      title: product.title,
      brand: product.brand ?? undefined,
      parentSku: product.parentSku ?? undefined,
      status: firstBinding?.publishStatus ?? product.status,
      localStatus: product.status,
      shopId: firstBinding?.shopId,
      platformShopId: firstBinding?.shopId,
      itemId: firstBinding?.itemId,
      stock,
      skuCount: product.skus.length,
      modelCount: product.skus.length,
      price: product.price?.toString() ?? '0.00',
      image: product.defaultImageUrl,
      updatedAt: product.updatedAt.toISOString(),
      createTime: product.createdAt.toISOString(),
      lastSyncTime: firstBinding?.lastSyncedAt?.toISOString(),
    };
  }

  private async ensureRemoteProductsImported(shopId: string) {
    const existing = await this.prismaService.erpPlatformProduct.count({
      where: {
        platform: 'SHOPEE',
        shopId,
      },
    });

    if (existing === 0) {
      await this.importRemoteProducts(shopId, false);
    }
  }

  private async importRemoteProducts(shopIdRaw: string, throwOnFailure: boolean) {
    const shopId = BigInt(shopIdRaw);
    const { token } =
      await this.shopeeTokenService.findRequiredTokenByShopId(shopId);
    const context = {
      shopId: Number(shopId),
      accessToken: token.accessToken,
    };
    let list: { item?: unknown };
    try {
      list = await this.productSdk.getItemList(context, {
        offset: 0,
        pageSize: 50,
        itemStatus: 'NORMAL',
      });
    } catch (error) {
      if (throwOnFailure) throw error;
      return 0;
    }
    const summaries = this.arrayRecords((list as Record<string, unknown>).item);
    const itemIds = summaries
      .map((item) => this.optionalNumber(item.item_id ?? item.itemId))
      .filter((itemId): itemId is number => itemId !== undefined);

    if (itemIds.length === 0) return 0;

    const baseInfo = await this.productSdk.getItemBaseInfo(context, itemIds);
    const baseItems = this.arrayRecords(
      (baseInfo as Record<string, unknown>).item_list,
    );
    const baseByItemId = new Map(
      baseItems
        .map((item) => [
          this.optionalString(item.item_id ?? item.itemId),
          item,
        ] as const)
        .filter(([itemId]) => Boolean(itemId)),
    );

    let synced = 0;
    for (const summary of summaries) {
      const itemId = this.optionalString(summary.item_id ?? summary.itemId);
      if (!itemId) continue;

      const base = baseByItemId.get(itemId) ?? summary;
      await this.upsertRemoteProduct(shopIdRaw, itemId, {
        ...summary,
        ...base,
      });
      synced += 1;
    }

    return synced;
  }

  private async upsertRemoteProduct(
    shopId: string,
    itemId: string,
    remote: Record<string, unknown>,
  ) {
    const title =
      this.optionalString(remote.item_name ?? remote.itemName ?? remote.name) ??
      `Shopee Item ${itemId}`;
    const skuCode =
      this.optionalString(remote.item_sku ?? remote.itemSku ?? remote.sku) ??
      `SHOPEE-${shopId}-${itemId}`;
    const price = this.extractPrice(remote);
    const stock = this.extractStock(remote);
    const imageUrl = this.extractImageUrl(remote);
    const status = this.toLocalProductStatus(
      this.optionalString(remote.item_status ?? remote.itemStatus),
    );
    const publishStatus = this.toPlatformPublishStatus(
      this.optionalString(remote.item_status ?? remote.itemStatus),
    );
    const raw = this.toJson(remote);
    const existing = await this.prismaService.erpPlatformProduct.findUnique({
      where: {
        platform_shopId_itemId: {
          platform: 'SHOPEE',
          shopId,
          itemId,
        },
      },
      include: {
        product: {
          include: {
            skus: true,
          },
        },
      },
    });

    if (existing) {
      await this.prismaService.erpProduct.update({
        where: { id: existing.productId },
        data: {
          title,
          parentSku: skuCode,
          price: price === undefined ? undefined : new Prisma.Decimal(String(price)),
          defaultImageUrl: imageUrl,
          status,
          raw,
          skus: existing.product.skus[0]
            ? {
                update: {
                  where: { id: existing.product.skus[0].id },
                  data: {
                    skuCode,
                    price:
                      price === undefined
                        ? undefined
                        : new Prisma.Decimal(String(price)),
                    stock,
                    status: status === ErpProductStatus.ACTIVE ? 'ACTIVE' : 'INACTIVE',
                    attributes: raw,
                  },
                },
              }
            : {
                create: {
                  skuCode,
                  price:
                    price === undefined
                      ? undefined
                      : new Prisma.Decimal(String(price)),
                  stock,
                  status: status === ErpProductStatus.ACTIVE ? 'ACTIVE' : 'INACTIVE',
                  attributes: raw,
                },
              },
          platformProducts: {
            update: {
              where: { id: existing.id },
              data: {
                title,
                publishStatus,
                raw,
                lastSyncedAt: new Date(),
              },
            },
          },
        },
      });
      return;
    }

    await this.prismaService.erpProduct.create({
      data: {
        title,
        parentSku: skuCode,
        price: price === undefined ? undefined : new Prisma.Decimal(String(price)),
        defaultImageUrl: imageUrl,
        status,
        raw,
        skus: {
          create: {
            skuCode,
            price: price === undefined ? undefined : new Prisma.Decimal(String(price)),
            stock,
            status: status === ErpProductStatus.ACTIVE ? 'ACTIVE' : 'INACTIVE',
            attributes: raw,
          },
        },
        platformProducts: {
          create: {
            platform: 'SHOPEE',
            shopId,
            itemId,
            title,
            publishStatus,
            raw,
            lastSyncedAt: new Date(),
          },
        },
      },
    });
  }

  private toLocalProductStatus(itemStatus?: string): ErpProductStatus {
    if (!itemStatus) return ErpProductStatus.ACTIVE;
    return ['DELETED', 'BANNED', 'UNLIST'].includes(itemStatus)
      ? ErpProductStatus.INACTIVE
      : ErpProductStatus.ACTIVE;
  }

  private toPlatformPublishStatus(itemStatus?: string): ErpPlatformPublishStatus {
    if (!itemStatus) return ErpPlatformPublishStatus.ACTIVE;
    if (['DELETED', 'BANNED', 'UNLIST'].includes(itemStatus)) {
      return ErpPlatformPublishStatus.INACTIVE;
    }
    return ErpPlatformPublishStatus.ACTIVE;
  }

  private extractPrice(remote: Record<string, unknown>) {
    const direct = this.optionalNumber(
      remote.price ??
        remote.original_price ??
        remote.originalPrice ??
        remote.current_price ??
        remote.currentPrice,
    );
    if (direct !== undefined) return direct;

    const priceInfo = this.arrayRecords(remote.price_info ?? remote.priceInfo)[0];
    return this.optionalNumber(
      priceInfo?.current_price ??
        priceInfo?.currentPrice ??
        priceInfo?.original_price ??
        priceInfo?.originalPrice,
    );
  }

  private extractStock(remote: Record<string, unknown>) {
    const direct = this.optionalNumber(remote.stock ?? remote.normal_stock);
    if (direct !== undefined) return direct;

    const stockInfo = this.asRecord(remote.stock_info_v2 ?? remote.stockInfoV2);
    const summary = this.asRecord(stockInfo.summary_info ?? stockInfo.summaryInfo);
    const summaryStock = this.optionalNumber(
      summary.total_available_stock ?? summary.totalAvailableStock,
    );
    if (summaryStock !== undefined) return summaryStock;

    const sellerStock = this.arrayRecords(stockInfo.seller_stock ?? stockInfo.sellerStock)[0];
    return (
      this.optionalNumber(sellerStock?.stock ?? sellerStock?.seller_stock) ?? 0
    );
  }

  private extractImageUrl(remote: Record<string, unknown>) {
    const image = this.asRecord(remote.image);
    const imageUrlList = [
      ...this.arrayRecords(image.image_url_list ?? image.imageUrlList),
      ...this.arrayRecords(remote.image_url_list ?? remote.imageUrlList),
    ];
    const firstRecordUrl = imageUrlList
      .map((item) => this.optionalString(item.image_url ?? item.imageUrl ?? item.url))
      .find(Boolean);
    if (firstRecordUrl) return firstRecordUrl;

    const stringList = [
      ...(Array.isArray(image.image_url_list) ? image.image_url_list : []),
      ...(Array.isArray(remote.image_url_list) ? remote.image_url_list : []),
    ];
    return stringList
      .map((item) => this.optionalString(item))
      .find(Boolean);
  }

  private normalizeShopeeImages(remote: Record<string, unknown>) {
    const image = this.asRecord(remote.image);
    const imageIds = [
      ...(Array.isArray(image.image_id_list) ? image.image_id_list : []),
      ...(Array.isArray(image.imageIdList) ? image.imageIdList : []),
      ...(Array.isArray(remote.image_id_list) ? remote.image_id_list : []),
      ...(Array.isArray(remote.imageIdList) ? remote.imageIdList : []),
    ];
    const imageUrls = [
      ...(Array.isArray(image.image_url_list) ? image.image_url_list : []),
      ...(Array.isArray(image.imageUrlList) ? image.imageUrlList : []),
      ...(Array.isArray(remote.image_url_list) ? remote.image_url_list : []),
      ...(Array.isArray(remote.imageUrlList) ? remote.imageUrlList : []),
    ];

    return imageUrls
      .map((url, index) => ({
        imageId: this.optionalString(imageIds[index]),
        url: this.optionalString(url),
      }))
      .filter((item) => item.imageId || item.url);
  }

  private normalizeShopeeVideos(remote: Record<string, unknown>) {
    return [
      ...this.arrayRecords(remote.video_info ?? remote.videoInfo),
      ...this.arrayRecords(remote.video_list ?? remote.videoList),
    ].map((video) => ({
      videoId: this.optionalString(video.video_id ?? video.videoId),
      videoUrl: this.optionalString(video.video_url ?? video.videoUrl),
      thumbnailUrl: this.optionalString(
        video.thumbnail_url ?? video.thumbnailUrl,
      ),
      duration: this.optionalNumber(video.duration),
      raw: video,
    }));
  }

  private collectOrderSkuCandidates(
    projections: Array<{
      shopId: string;
      orderSn: string;
      buyerUsername: string | null;
      raw: Prisma.JsonValue | null;
      updateTime: Date | null;
      updatedAt: Date;
    }>,
  ) {
    const seen = new Map<string, {
      shopId: string;
      orderSn: string;
      buyerUsername?: string;
      itemId: string;
      modelId?: string;
      platformSkuId?: string;
      platformSkuCode?: string;
      itemName?: string;
      modelName?: string;
      quantity: number;
      lastSeenAt: string;
    }>();

    for (const projection of projections) {
      const raw = this.asRecord(projection.raw);
      const items = [
        ...this.arrayRecords(raw.item_list),
        ...this.arrayRecords(raw.itemList),
        ...this.arrayRecords(raw.package_list).flatMap((pkg) => [
          ...this.arrayRecords(pkg.item_list),
          ...this.arrayRecords(pkg.itemList),
        ]),
      ];

      for (const item of items) {
        const itemId = this.optionalString(item.item_id ?? item.itemId);
        if (!itemId) continue;
        const modelId = this.optionalString(item.model_id ?? item.modelId);
        const platformSkuId = modelId || this.optionalString(item.order_item_id ?? item.orderItemId);
        const platformSkuCode = this.optionalString(item.model_sku ?? item.item_sku ?? item.sku);
        const key = `${projection.shopId}:${itemId}:${modelId || platformSkuCode || '-'}`;
        const existing = seen.get(key);
        const quantity =
          this.optionalNumber(item.model_quantity_purchased) ??
          this.optionalNumber(item.model_quantity) ??
          this.optionalNumber(item.quantity) ??
          0;

        seen.set(key, {
          shopId: projection.shopId,
          orderSn: existing?.orderSn ?? projection.orderSn,
          buyerUsername: projection.buyerUsername ?? existing?.buyerUsername,
          itemId,
          modelId,
          platformSkuId,
          platformSkuCode,
          itemName: this.optionalString(item.item_name ?? item.itemName),
          modelName: this.optionalString(item.model_name ?? item.modelName),
          quantity: (existing?.quantity ?? 0) + quantity,
          lastSeenAt: (projection.updateTime ?? projection.updatedAt).toISOString(),
        });
      }
    }

    return Array.from(seen.values());
  }

  private resolveSkuInputs(payload: CreateErpProductDto) {
    if (payload.skus?.length) return payload.skus;
    return [
      {
        skuCode: payload.parentSku || `SKU-${Date.now()}`,
        price: payload.price,
        costPrice: payload.costPrice,
        stock: 0,
      },
    ];
  }

  private isProductStatus(value?: string): value is ErpProductStatus {
    return Boolean(value && value in ErpProductStatus);
  }

  private optionalDecimal(value?: number) {
    return value === undefined || value === null
      ? undefined
      : new Prisma.Decimal(String(value));
  }

  private optionalString(value: unknown) {
    return value === undefined || value === null || value === ''
      ? undefined
      : String(value);
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

  private async recordMappingLog(input: {
    productId?: string;
    skuId?: string;
    shopId?: string;
    itemId?: string;
    modelId?: string;
    action: string;
    status: string;
    message?: string;
    request?: unknown;
    response?: unknown;
  }) {
    return this.prismaService.erpSkuMappingLog.create({
      data: {
        productId: input.productId,
        skuId: input.skuId,
        shopId: input.shopId,
        itemId: input.itemId,
        modelId: input.modelId,
        action: input.action,
        status: input.status,
        message: input.message,
        request: input.request ? this.toJson(input.request) : undefined,
        response: input.response ? this.toJson(input.response) : undefined,
      },
    });
  }

  private toJson(input: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
  }
}
