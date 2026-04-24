import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProductModelDto } from './model.dto';

export class ProductAttributeValueDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  attributeId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  valueId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  valueName?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

export class ProductDimensionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  packageLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  packageWidth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  packageHeight?: number;
}

export class ProductPreOrderDto {
  @ApiProperty()
  @IsBoolean()
  isPreOrder!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  daysToShip?: number;
}

export class ProductLogisticsChannelDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  logisticId!: number;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  sizeId?: number;
}

export class ProductTierVariationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  options!: string[];
}

export class ProductImageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Base64 content without data URL header is accepted.',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;
}

export class CreateProductDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  itemName!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  originalPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemSku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  condition?: 'NEW' | 'USED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  brandId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ type: () => ProductDimensionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDimensionDto)
  dimension?: ProductDimensionDto;

  @ApiPropertyOptional({ type: () => [ProductAttributeValueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeValueDto)
  attributes?: ProductAttributeValueDto[];

  @ApiPropertyOptional({ type: () => ProductPreOrderDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductPreOrderDto)
  preOrder?: ProductPreOrderDto;

  @ApiPropertyOptional({ type: () => [ProductLogisticsChannelDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductLogisticsChannelDto)
  logisticInfo?: ProductLogisticsChannelDto[];

  @ApiPropertyOptional({ type: () => [ProductTierVariationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTierVariationDto)
  tierVariation?: ProductTierVariationDto[];

  @ApiPropertyOptional({ type: () => [ProductModelDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductModelDto)
  models?: ProductModelDto[];

  @ApiPropertyOptional({ type: () => [ProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enqueueSync?: boolean;
}

export class UpdateProductDto extends CreateProductDto {}
