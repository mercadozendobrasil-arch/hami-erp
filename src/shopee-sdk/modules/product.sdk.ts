import { Injectable } from '@nestjs/common';

import {
  ShopeeBusinessContext,
  ShopeePaginationQuery,
} from '../../common/shopee/shopee.types';
import { ShopeeHttpClient } from '../../common/shopee/shopee-http.client';

export interface ShopeeCategory {
  category_id: number;
  display_name?: string;
  parent_category_id?: number;
  has_children?: boolean;
}

export interface ShopeeAttribute {
  attribute_id: number;
  original_attribute_name?: string;
  is_mandatory?: boolean;
  input_type?: string;
}

export interface ShopeeBrand {
  brand_id: number;
  original_brand_name?: string;
}

export interface ShopeeItemSummary {
  item_id: number;
  item_status?: string;
  update_time?: number;
}

export interface ShopeeItemModelPayload {
  modelId?: number;
  modelSku?: string;
  modelName?: string;
  priceInfo?: {
    currency?: string;
    originalPrice: number;
    currentPrice?: number;
  };
  stockInfo?: Array<{
    locationId?: string;
    sellerStock: number;
  }>;
  tierIndex?: number[];
}

export interface ShopeeProductPayload {
  categoryId: number;
  originalPrice: number;
  itemName: string;
  description?: string;
  itemSku?: string;
  condition?: 'NEW' | 'USED';
  brandId?: number;
  images?: string[];
  weight?: number;
  dimension?: {
    packageLength?: number;
    packageWidth?: number;
    packageHeight?: number;
  };
  attributes?: Array<{
    attributeId: number;
    valueId?: number;
    valueName?: string;
    values?: string[];
  }>;
  preOrder?: {
    isPreOrder: boolean;
    daysToShip?: number;
  };
  logisticInfo?: Array<{
    logisticId: number;
    enabled: boolean;
    shippingFee?: number;
    sizeId?: number;
  }>;
  tierVariation?: Array<{
    name: string;
    options: string[];
  }>;
  models?: ShopeeItemModelPayload[];
}

export interface ShopeeSearchItemPayload extends ShopeePaginationQuery {
  itemName?: string;
  itemSku?: string;
  itemStatus?: string[];
  updateTimeFrom?: number;
  updateTimeTo?: number;
}

export interface ShopeeUpdatePricePayload {
  itemId: number;
  models: Array<{
    modelId?: number;
    originalPrice: number;
    currentPrice?: number;
  }>;
}

export interface ShopeeUpdateStockPayload {
  itemId: number;
  models: Array<{
    modelId?: number;
    sellerStock: number;
    locationId?: string;
  }>;
}

@Injectable()
export class ProductSdk {
  constructor(private readonly shopeeHttpClient: ShopeeHttpClient) {}

  getCategory(language = 'en'): Promise<{ categories: ShopeeCategory[] }> {
    return this.shopeeHttpClient.request({
      method: 'GET',
      path: '/product/get_category',
      query: { language },
    });
  }

  getAttributeTree(categoryId: number, language = 'en') {
    return this.shopeeHttpClient.request<{ attribute_list: ShopeeAttribute[] }>(
      {
        method: 'GET',
        path: '/product/get_attributes',
        query: {
          category_id: categoryId,
          language,
        },
      },
    );
  }

  getBrandList(categoryId: number, status = 'NORMAL') {
    return this.shopeeHttpClient.request<{ brand_list: ShopeeBrand[] }>({
      method: 'GET',
      path: '/product/get_brand_list',
      query: {
        category_id: categoryId,
        status,
      },
    });
  }

  getItemLimit(categoryId: number) {
    return this.shopeeHttpClient.request<{ item_limit: number }>({
      method: 'GET',
      path: '/product/get_item_limit',
      query: {
        category_id: categoryId,
      },
    });
  }

  getItemList(
    context: ShopeeBusinessContext,
    query: ShopeePaginationQuery = {},
  ) {
    return this.shopeeHttpClient.request<{ item: ShopeeItemSummary[] }>({
      method: 'GET',
      path: '/product/get_item_list',
      accessToken: context.accessToken,
      shopId: context.shopId,
      query: {
        offset: query.offset ?? 0,
        page_size: query.pageSize ?? 50,
      },
    });
  }

  getItemBaseInfo(context: ShopeeBusinessContext, itemIds: number[]) {
    return this.shopeeHttpClient.request<{ item_list: unknown[] }>({
      method: 'GET',
      path: '/product/get_item_base_info',
      accessToken: context.accessToken,
      shopId: context.shopId,
      query: {
        item_id_list: itemIds.join(','),
      },
    });
  }

  getItemExtraInfo(context: ShopeeBusinessContext, itemIds: number[]) {
    return this.shopeeHttpClient.request<{ item_list: unknown[] }>({
      method: 'GET',
      path: '/product/get_item_extra_info',
      accessToken: context.accessToken,
      shopId: context.shopId,
      query: {
        item_id_list: itemIds.join(','),
      },
    });
  }

  addItem(context: ShopeeBusinessContext, payload: ShopeeProductPayload) {
    return this.shopeeHttpClient.request<{ item_id: number }>({
      method: 'POST',
      path: '/product/add_item',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: payload,
    });
  }

  updateItem(
    context: ShopeeBusinessContext,
    itemId: number,
    payload: Partial<ShopeeProductPayload>,
  ) {
    return this.shopeeHttpClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/product/update_item',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: {
        itemId,
        ...payload,
      },
    });
  }

  deleteItem(context: ShopeeBusinessContext, itemId: number) {
    return this.shopeeHttpClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/product/delete_item',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: { itemId },
    });
  }

  unlistItem(context: ShopeeBusinessContext, itemId: number) {
    return this.shopeeHttpClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/product/unlist_item',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: { itemId },
    });
  }

  searchItem(context: ShopeeBusinessContext, payload: ShopeeSearchItemPayload) {
    return this.shopeeHttpClient.request<{ item: ShopeeItemSummary[] }>({
      method: 'POST',
      path: '/product/search_item',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: payload,
    });
  }

  updatePrice(
    context: ShopeeBusinessContext,
    payload: ShopeeUpdatePricePayload,
  ) {
    return this.shopeeHttpClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/product/update_price',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: payload,
    });
  }

  updateStock(
    context: ShopeeBusinessContext,
    payload: ShopeeUpdateStockPayload,
  ) {
    return this.shopeeHttpClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/product/update_stock',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: payload,
    });
  }

  getItemViolationInfo(context: ShopeeBusinessContext, itemId: number) {
    return this.shopeeHttpClient.request<{ violation_list: unknown[] }>({
      method: 'GET',
      path: '/product/get_item_violation_info',
      accessToken: context.accessToken,
      shopId: context.shopId,
      query: { item_id: itemId },
    });
  }

  initTierVariation(
    context: ShopeeBusinessContext,
    itemId: number,
    tierVariation: NonNullable<ShopeeProductPayload['tierVariation']>,
  ) {
    return this.shopeeHttpClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/product/init_tier_variation',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: {
        itemId,
        tierVariation,
      },
    });
  }

  updateTierVariation(
    context: ShopeeBusinessContext,
    itemId: number,
    tierVariation: NonNullable<ShopeeProductPayload['tierVariation']>,
  ) {
    return this.shopeeHttpClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/product/update_tier_variation',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: {
        itemId,
        tierVariation,
      },
    });
  }

  getModelList(context: ShopeeBusinessContext, itemId: number) {
    return this.shopeeHttpClient.request<{ model: unknown[] }>({
      method: 'GET',
      path: '/product/get_model_list',
      accessToken: context.accessToken,
      shopId: context.shopId,
      query: { item_id: itemId },
    });
  }

  addModel(
    context: ShopeeBusinessContext,
    itemId: number,
    modelList: ShopeeItemModelPayload[],
  ) {
    return this.shopeeHttpClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/product/add_model',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: {
        itemId,
        modelList,
      },
    });
  }

  updateModel(
    context: ShopeeBusinessContext,
    itemId: number,
    model: ShopeeItemModelPayload,
  ) {
    return this.shopeeHttpClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/product/update_model',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: {
        itemId,
        model,
      },
    });
  }

  deleteModel(context: ShopeeBusinessContext, itemId: number, modelId: number) {
    return this.shopeeHttpClient.request<{ success: boolean }>({
      method: 'POST',
      path: '/product/delete_model',
      accessToken: context.accessToken,
      shopId: context.shopId,
      body: {
        itemId,
        modelId,
      },
    });
  }
}
