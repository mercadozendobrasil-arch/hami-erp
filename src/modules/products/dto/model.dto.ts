import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductModelStockDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  sellerStock!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationId?: string;
}

export class ProductModelPriceDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  originalPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}

export class ProductModelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  modelId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelSku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelName?: string;

  @ApiPropertyOptional({ type: () => ProductModelPriceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductModelPriceDto)
  priceInfo?: ProductModelPriceDto;

  @ApiPropertyOptional({ type: () => [ProductModelStockDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductModelStockDto)
  stockInfo?: ProductModelStockDto[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tierIndex?: number[];
}
