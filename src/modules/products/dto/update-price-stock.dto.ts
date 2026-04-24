import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdatePriceModelDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  originalPrice!: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentPrice?: number;

  @ApiProperty()
  @IsOptional()
  @IsInt()
  @Min(1)
  modelId?: number;
}

export class UpdateStockModelDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  sellerStock!: number;

  @ApiProperty()
  @IsOptional()
  @IsInt()
  @Min(1)
  modelId?: number;
}

export class UpdatePriceDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  itemId!: number;

  @ApiProperty({ type: () => [UpdatePriceModelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePriceModelDto)
  models!: UpdatePriceModelDto[];
}

export class UpdateStockDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  itemId!: number;

  @ApiProperty({ type: () => [UpdateStockModelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateStockModelDto)
  models!: UpdateStockModelDto[];
}
