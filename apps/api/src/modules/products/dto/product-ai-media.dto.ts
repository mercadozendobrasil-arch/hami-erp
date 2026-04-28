import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const productAiTaskTypes = [
  'poster_batch',
  'main_image_optimize',
  'scene_image',
  'detail_content_image',
  'full_edit',
  'partial_edit',
] as const;

export const productMediaUsageTypes = [
  'product_main',
  'product_detail',
  'marketing_material',
  'channel_publish',
] as const;

export class UploadProductMediaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiPropertyOptional({ default: 'default' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({ enum: ['image', 'video', 'attachment'] })
  @IsIn(['image', 'video', 'attachment'])
  mediaType!: string;

  @ApiPropertyOptional({ enum: ['original', 'product', 'sku', 'ai'] })
  @IsOptional()
  @IsIn(['original', 'product', 'sku', 'ai'])
  sourceType?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortNo?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @ApiPropertyOptional({ default: 'system' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class CreateProductAiTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiPropertyOptional({ default: 'default' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({ enum: productAiTaskTypes })
  @IsIn(productAiTaskTypes)
  taskType!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  sourceMediaIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  stylePreference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  bizGoal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extraPrompt?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalCount?: number;

  @ApiPropertyOptional({ default: 'system' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class BindProductMediaUsageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  assetId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  versionId!: string;

  @ApiProperty({ enum: productMediaUsageTypes })
  @IsIn(productMediaUsageTypes)
  usageType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  usageTarget?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortNo?: number;

  @ApiPropertyOptional({ default: 'system' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class SwitchProductAiAssetVersionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  versionId!: string;
}

export class EditProductAiAssetDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  editPrompt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ default: 'system' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
