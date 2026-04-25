import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
  @IsIn(ERP_FULFILLMENT_STAGES)
  fulfillmentStage?: ErpFulfillmentStage;

  @IsOptional()
  @IsString()
  orderSn?: string;

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
}
