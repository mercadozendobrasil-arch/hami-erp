import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class ShippingChannelDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  logisticId!: number;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @ApiProperty()
  @IsOptional()
  @IsInt()
  @Min(1)
  sizeId?: number;
}

export class UpdateShippingInfoDto {
  @ApiProperty({ type: () => [ShippingChannelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingChannelDto)
  logisticsChannels!: ShippingChannelDto[];
}
