import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadImageDto {
  @ApiProperty({ description: 'Base64 image content or data URL.' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ default: 'upload.jpg' })
  @IsOptional()
  @IsString()
  fileName?: string;
}
