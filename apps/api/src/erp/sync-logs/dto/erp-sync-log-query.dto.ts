import { IsOptional, IsString } from 'class-validator';

export class ErpSyncLogQueryDto {
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
