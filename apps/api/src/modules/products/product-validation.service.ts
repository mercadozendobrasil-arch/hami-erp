import { BadRequestException, Injectable } from '@nestjs/common';

import { CreateProductDto } from './dto/product.dto';
import { ProductModelDto } from './dto/model.dto';

@Injectable()
export class ProductValidationService {
  validatePublishPayload(payload: CreateProductDto) {
    if (!payload.images?.length) {
      throw new BadRequestException('At least one product image is required.');
    }

    if (payload.tierVariation?.length && !payload.models?.length) {
      throw new BadRequestException(
        'Models are required when tier variation is provided.',
      );
    }

    payload.models?.forEach((model, index) =>
      this.validateModelPayload(model, index),
    );
  }

  private validateModelPayload(model: ProductModelDto, index: number) {
    if (model.priceInfo === undefined) {
      throw new BadRequestException(
        `Model at index ${index} must include priceInfo.`,
      );
    }

    if (!model.stockInfo?.length) {
      throw new BadRequestException(
        `Model at index ${index} must include stockInfo.`,
      );
    }
  }
}
