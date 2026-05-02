import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

class ErpPickupDto {
  @IsOptional()
  addressId?: number;

  @IsOptional()
  @IsString()
  pickupTimeId?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

class ErpDropoffDto {
  @IsOptional()
  branchId?: number;

  @IsOptional()
  @IsString()
  senderRealName?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

class ErpNonIntegratedDto {
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

export class ErpOrderShopActionDto {
  @IsString()
  shopId!: string;
}

export class ErpAutoInvoiceDto extends ErpOrderShopActionDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  packageNumber?: string;

  @IsOptional()
  @IsString()
  shippingDocumentType?: string;
}

export class ErpOrderExceptionTargetDto extends ErpOrderShopActionDto {
  @IsString()
  orderSn!: string;
}

export class ErpOrderExceptionBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ErpOrderExceptionTargetDto)
  orders!: ErpOrderExceptionTargetDto[];

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ErpOrderNoteDto extends ErpOrderShopActionDto {
  @IsString()
  remark!: string;
}

export class ErpOrderAuditDto extends ErpOrderShopActionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ErpOrderCancelDto extends ErpOrderShopActionDto {
  @IsString()
  cancelReason!: string;
}

export class ErpOrderWarehouseDto extends ErpOrderShopActionDto {
  @IsString()
  warehouseName!: string;

  @IsOptional()
  @IsString()
  allocationReason?: string;
}

export class ErpOrderLogisticsDto extends ErpOrderShopActionDto {
  @IsString()
  logisticsChannel!: string;

  @IsOptional()
  @IsString()
  shippingCarrier?: string;
}

export class ErpOrderTagsDto extends ErpOrderShopActionDto {
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  tags!: string[];
}

export class ErpOrderAfterSaleDto extends ErpOrderShopActionDto {
  @IsString()
  afterSaleStatus!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ErpOrderSplitDto extends ErpOrderShopActionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  childOrderSns!: string[];

  @IsOptional()
  @IsString()
  splitGroupId?: string;
}

export class ErpOrderMergeDto extends ErpOrderShopActionDto {
  @IsString()
  targetOrderSn!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  sourceOrderSns!: string[];
}

export class ErpOrderLockDto extends ErpOrderShopActionDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  locked?: boolean;
}

export class ErpPrintLabelTaskItemDto {
  @IsString()
  orderSn!: string;

  @IsOptional()
  @IsString()
  packageNumber?: string;

  @IsOptional()
  @IsString()
  shippingDocumentType?: string;
}

export class ErpPrintLabelTaskDto {
  @IsString()
  shopId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ErpPrintLabelTaskItemDto)
  orders!: ErpPrintLabelTaskItemDto[];
}

export class ErpMarkReadyForPickupDto {
  @IsString()
  shopId!: string;

  @IsOptional()
  @IsString()
  packageNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ErpPickupDto)
  pickup?: ErpPickupDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ErpDropoffDto)
  dropoff?: ErpDropoffDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ErpNonIntegratedDto)
  nonIntegrated?: ErpNonIntegratedDto;
}

export class ErpBatchPickupItemDto {
  @IsString()
  orderSn!: string;

  @IsOptional()
  @IsString()
  packageNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ErpPickupDto)
  pickup?: ErpPickupDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ErpDropoffDto)
  dropoff?: ErpDropoffDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ErpNonIntegratedDto)
  nonIntegrated?: ErpNonIntegratedDto;
}

export class ErpBatchMarkReadyForPickupDto {
  @IsString()
  shopId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ErpBatchPickupItemDto)
  orders!: ErpBatchPickupItemDto[];
}

export class ErpBatchMarkShippedDto {
  @IsString()
  shopId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  orderSns!: string[];
}
