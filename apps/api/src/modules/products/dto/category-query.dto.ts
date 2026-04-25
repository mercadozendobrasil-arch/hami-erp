import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CategoryQueryDto {
  @ApiPropertyOptional({ default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;
}
