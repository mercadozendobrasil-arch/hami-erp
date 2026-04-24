import { Injectable } from '@nestjs/common';

import { ProductSyncQueueService } from '../../infra/queue/product-sync.queue';
import { ProductSdk } from '../../shopee-sdk/modules/product.sdk';
import { ShopeeBusinessContext } from '../../common/shopee/shopee.types';
import { LogisticsSdk } from '../../shopee-sdk/modules/logistics.sdk';
import { MediaSdk } from '../../shopee-sdk/modules/media.sdk';
import { ProductPayloadMapper } from './product-payload.mapper';
import { ProductValidationService } from './product-validation.service';
import { CreateProductDto, ProductImageDto } from './dto/product.dto';

@Injectable()
export class ProductPublishService {
  constructor(
    private readonly productValidationService: ProductValidationService,
    private readonly productPayloadMapper: ProductPayloadMapper,
    private readonly productSdk: ProductSdk,
    private readonly mediaSdk: MediaSdk,
    private readonly logisticsSdk: LogisticsSdk,
    private readonly productSyncQueueService: ProductSyncQueueService,
  ) {}

  async publish(context: ShopeeBusinessContext, payload: CreateProductDto) {
    this.productValidationService.validatePublishPayload(payload);

    const imageIds = await this.resolveImageIds(payload.images ?? []);
    const addItemPayload = this.productPayloadMapper.toAddItemPayload(
      payload,
      imageIds,
    );
    const addItemResult = await this.productSdk.addItem(
      context,
      addItemPayload,
    );

    if (payload.tierVariation?.length) {
      await this.productSdk.initTierVariation(
        context,
        addItemResult.item_id,
        payload.tierVariation,
      );
    }

    if (payload.models?.length) {
      await this.productSdk.addModel(
        context,
        addItemResult.item_id,
        payload.models.map((model) =>
          this.productPayloadMapper.toModelPayload(model),
        ),
      );
    }

    if (payload.logisticInfo?.length) {
      await this.logisticsSdk.updateShippingInfo(
        context,
        addItemResult.item_id,
        {
          logisticsChannels: payload.logisticInfo,
        },
      );
    }

    if (payload.enqueueSync ?? true) {
      await this.productSyncQueueService.enqueue({
        shopId: context.shopId,
        itemId: addItemResult.item_id,
        accessToken: context.accessToken,
        trigger: 'publish',
      });
    }

    return {
      itemId: addItemResult.item_id,
      imageIds,
      queued: payload.enqueueSync ?? true,
    };
  }

  private async resolveImageIds(images: ProductImageDto[]) {
    const resolved: string[] = [];

    for (const image of images) {
      if (image.imageId) {
        resolved.push(image.imageId);
        continue;
      }

      if (!image.content) {
        continue;
      }

      const fileName = image.fileName ?? `image-${Date.now()}.jpg`;
      const buffer = Buffer.from(this.normalizeBase64(image.content), 'base64');
      const uploadResult = await this.mediaSdk.uploadImage({
        image: buffer,
        fileName,
      });

      if (uploadResult.image_info?.image_id) {
        resolved.push(uploadResult.image_info.image_id);
        continue;
      }

      if (!uploadResult.upload_id) {
        continue;
      }

      const imageResult = await this.mediaSdk.getImageUploadResult(
        uploadResult.upload_id,
      );

      if (imageResult.image_info?.image_id) {
        resolved.push(imageResult.image_info.image_id);
      }
    }

    return resolved;
  }

  private normalizeBase64(content: string) {
    return content.includes(',') ? (content.split(',')[1] ?? content) : content;
  }
}
