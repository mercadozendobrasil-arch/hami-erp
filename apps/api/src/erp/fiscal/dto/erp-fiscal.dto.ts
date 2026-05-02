import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const FISCAL_DOCUMENT_TYPES = ['NFE', 'NFCE', 'NFSE', 'CTE', 'MDFE', 'DCE'] as const;
const FISCAL_DOCUMENT_STATUSES = [
  'DRAFT',
  'PROCESSING',
  'AUTHORIZED',
  'REJECTED',
  'CANCELLED',
  'FAILED',
  'UNKNOWN',
] as const;

export class ErpFiscalDocumentQueryDto {
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  orderSn?: string;

  @IsOptional()
  @IsIn(FISCAL_DOCUMENT_TYPES)
  type?: (typeof FISCAL_DOCUMENT_TYPES)[number];

  @IsOptional()
  @IsIn(FISCAL_DOCUMENT_STATUSES)
  status?: (typeof FISCAL_DOCUMENT_STATUSES)[number];

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

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
