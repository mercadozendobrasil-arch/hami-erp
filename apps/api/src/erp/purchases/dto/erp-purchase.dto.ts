import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ErpSupplierQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CreateErpSupplierDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class ErpPurchaseQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  current?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class CreateErpPurchaseOrderItemDto {
  @IsString()
  skuId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  unitCost?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateErpPurchaseOrderDto {
  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  expectedArriveAt?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateErpPurchaseOrderItemDto)
  items!: CreateErpPurchaseOrderItemDto[];
}

export class ReceiveErpPurchaseOrderItemDto {
  @IsString()
  itemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ReceiveErpPurchaseOrderDto {
  @IsString()
  warehouseId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ReceiveErpPurchaseOrderItemDto)
  items!: ReceiveErpPurchaseOrderItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}
