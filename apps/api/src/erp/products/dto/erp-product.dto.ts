import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ErpSkuInputDto {
  @IsString()
  skuCode!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  optionName?: string;

  @IsOptional()
  @IsString()
  optionValue?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}

export class CreateErpProductDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  parentSku?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  widthCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heightCm?: number;

  @IsOptional()
  @IsString()
  defaultImageUrl?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ErpSkuInputDto)
  skus?: ErpSkuInputDto[];
}

export class BindErpSkuMappingDto {
  @IsString()
  shopId!: string;

  @IsString()
  itemId!: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsString()
  skuId!: string;

  @IsOptional()
  @IsString()
  platformSkuId?: string;

  @IsOptional()
  @IsString()
  skuCode?: string;
}
