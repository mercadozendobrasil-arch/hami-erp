import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const ERP_FULFILLMENT_STAGES = [
  'pending_invoice',
  'pending_shipment',
  'pending_print',
  'pending_pickup',
  'shipped',
] as const;

export type ErpFulfillmentStage = (typeof ERP_FULFILLMENT_STAGES)[number];

export class ErpOrderQueryDto {
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  currentTab?: string;

  @IsOptional()
  sorter?: unknown;

  @IsOptional()
  @IsIn(ERP_FULFILLMENT_STAGES)
  fulfillmentStage?: ErpFulfillmentStage;

  @IsOptional()
  @IsString()
  orderSn?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  hasActiveException?: boolean;

  @IsOptional()
  @IsString()
  exceptionType?: string;

  @IsOptional()
  @IsString()
  exceptionStatus?: string;

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

export class ErpOrderStatusCountQueryDto {
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  token?: string;
}

export class ErpOrderLogQueryDto {
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  orderSn?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  status?: string;

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
