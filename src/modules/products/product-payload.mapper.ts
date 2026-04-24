import { Injectable } from '@nestjs/common';

import { ProductModelDto } from './dto/model.dto';
import { CreateProductDto, ProductImageDto } from './dto/product.dto';
import {
  ShopeeItemModelPayload,
  ShopeeProductPayload,
  ShopeeUpdatePricePayload,
  ShopeeUpdateStockPayload,
} from '../../shopee-sdk/modules/product.sdk';

@Injectable()
export class ProductPayloadMapper {
  toAddItemPayload(
    payload: CreateProductDto,
    imageIds: string[],
  ): ShopeeProductPayload {
    return {
      categoryId: payload.categoryId,
      itemName: payload.itemName,
      description: payload.description,
      itemSku: payload.itemSku,
      condition: payload.condition,
      originalPrice: payload.originalPrice,
      brandId: payload.brandId,
      images: imageIds,
      weight: payload.weight,
      dimension: payload.dimension,
      attributes: payload.attributes,
      preOrder: payload.preOrder,
      logisticInfo: payload.logisticInfo,
      tierVariation: payload.tierVariation,
      models: payload.models?.map((model) => this.toModelPayload(model)),
    };
  }

  toUpdateItemPayload(payload: CreateProductDto, imageIds: string[]) {
    return this.toAddItemPayload(payload, imageIds);
  }

  toModelPayload(model: ProductModelDto): ShopeeItemModelPayload {
    return {
      modelId: model.modelId,
      modelSku: model.modelSku,
      modelName: model.modelName,
      priceInfo: model.priceInfo,
      stockInfo: model.stockInfo,
      tierIndex: model.tierIndex,
    };
  }

  toUpdatePricePayload(
    itemId: number,
    models: UpdatePriceInput[],
  ): ShopeeUpdatePricePayload {
    return {
      itemId,
      models,
    };
  }

  toUpdateStockPayload(
    itemId: number,
    models: UpdateStockInput[],
  ): ShopeeUpdateStockPayload {
    return {
      itemId,
      models,
    };
  }

  hasInlineImages(images?: ProductImageDto[]) {
    return (
      images?.some(
        (image) => image.content !== undefined || image.imageUrl !== undefined,
      ) ?? false
    );
  }
}

type UpdatePriceInput = ShopeeUpdatePricePayload['models'][number];
type UpdateStockInput = ShopeeUpdateStockPayload['models'][number];
