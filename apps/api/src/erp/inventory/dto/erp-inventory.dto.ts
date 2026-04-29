import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ErpInventoryQueryDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  current?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class CreateErpWarehouseDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AdjustInventoryDto {
  @IsString()
  warehouseId!: string;

  @IsString()
  skuId!: string;

  @IsInt()
  quantity!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  safetyStock?: number;

  @IsOptional()
  @IsString()
  movementType?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ReserveInventoryDto {
  @IsString()
  warehouseId!: string;

  @IsString()
  skuId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  orderSn?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ReleaseInventoryDto {
  @IsString()
  reservationId!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
