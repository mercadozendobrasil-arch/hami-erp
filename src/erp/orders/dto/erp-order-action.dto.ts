import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

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

export class ErpBatchPickupItemDto extends ErpMarkReadyForPickupDto {
  @IsString()
  orderSn!: string;
}
