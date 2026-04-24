import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class OrderListQueryDto {
  @IsOptional()
  @IsString()
  timeRangeField?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  timeFrom?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  timeTo?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  orderStatus?: string;

  @IsOptional()
  @IsString()
  responseOptionalFields?: string;
}
