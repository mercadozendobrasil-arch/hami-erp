import { Injectable } from '@nestjs/common';

import { ProductSyncQueueService } from '../../infra/queue/product-sync.queue';
import { ShopeeBusinessContext } from '../../common/shopee/shopee.types';
import { ProductSdk } from '../../shopee-sdk/modules/product.sdk';
import { CreateProductDto } from './dto/product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { UpdatePriceDto, UpdateStockDto } from './dto/update-price-stock.dto';
import { ProductPublishService } from './product-publish.service';
import { ProductPayloadMapper } from './product-payload.mapper';
import { ProductModelDto } from './dto/model.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productSdk: ProductSdk,
    private readonly productPublishService: ProductPublishService,
    private readonly productPayloadMapper: ProductPayloadMapper,
    private readonly productSyncQueueService: ProductSyncQueueService,
  ) {}

  listCategories(language?: string) {
    return this.productSdk.getCategory(language);
  }

  getCategoryAttributes(categoryId: number, language?: string) {
    return this.productSdk.getAttributeTree(categoryId, language);
  }

  getCategoryBrands(categoryId: number) {
    return this.productSdk.getBrandList(categoryId);
  }

  getCategoryLimits(categoryId: number) {
    return this.productSdk.getItemLimit(categoryId);
  }

  listProducts(context: ShopeeBusinessContext) {
    return this.productSdk.getItemList(context);
  }

  async getProduct(context: ShopeeBusinessContext, itemId: number) {
    const [baseInfo, extraInfo, violationInfo] = await Promise.all([
      this.productSdk.getItemBaseInfo(context, [itemId]),
      this.productSdk.getItemExtraInfo(context, [itemId]),
      this.productSdk.getItemViolationInfo(context, itemId),
    ]);

    return {
      itemId,
      baseInfo,
      extraInfo,
      violationInfo,
    };
  }

  createProduct(context: ShopeeBusinessContext, payload: CreateProductDto) {
    return this.productPublishService.publish(context, payload);
  }

  async updateProduct(
    context: ShopeeBusinessContext,
    itemId: number,
    payload: CreateProductDto,
  ) {
    const imageIds =
      payload.images
        ?.map((image) => image.imageId)
        .filter((imageId): imageId is string => imageId !== undefined) ?? [];

    const updatePayload = this.productPayloadMapper.toUpdateItemPayload(
      payload,
      imageIds,
    );

    return this.productSdk.updateItem(context, itemId, updatePayload);
  }

  deleteProduct(context: ShopeeBusinessContext, itemId: number) {
    return this.productSdk.deleteItem(context, itemId);
  }

  searchProducts(context: ShopeeBusinessContext, payload: SearchProductsDto) {
    return this.productSdk.searchItem(context, payload);
  }

  unlistProduct(context: ShopeeBusinessContext, itemId: number) {
    return this.productSdk.unlistItem(context, itemId);
  }

  async syncProduct(context: ShopeeBusinessContext, itemId: number) {
    const job = await this.productSyncQueueService.enqueue({
      shopId: context.shopId,
      itemId,
      accessToken: context.accessToken,
      trigger: 'manual',
    });

    return {
      jobId: job.id,
      itemId,
      status: 'queued',
    };
  }

  getModelList(context: ShopeeBusinessContext, itemId: number) {
    return this.productSdk.getModelList(context, itemId);
  }

  addModel(
    context: ShopeeBusinessContext,
    itemId: number,
    model: ProductModelDto,
  ) {
    return this.productSdk.addModel(context, itemId, [
      this.productPayloadMapper.toModelPayload(model),
    ]);
  }

  updateModel(
    context: ShopeeBusinessContext,
    itemId: number,
    modelId: number,
    model: ProductModelDto,
  ) {
    return this.productSdk.updateModel(context, itemId, {
      ...this.productPayloadMapper.toModelPayload(model),
      modelId,
    });
  }

  deleteModel(context: ShopeeBusinessContext, itemId: number, modelId: number) {
    return this.productSdk.deleteModel(context, itemId, modelId);
  }

  updatePrice(context: ShopeeBusinessContext, payload: UpdatePriceDto) {
    return this.productSdk.updatePrice(
      context,
      this.productPayloadMapper.toUpdatePricePayload(
        payload.itemId,
        payload.models,
      ),
    );
  }

  updateStock(context: ShopeeBusinessContext, payload: UpdateStockDto) {
    return this.productSdk.updateStock(
      context,
      this.productPayloadMapper.toUpdateStockPayload(
        payload.itemId,
        payload.models,
      ),
    );
  }
}
