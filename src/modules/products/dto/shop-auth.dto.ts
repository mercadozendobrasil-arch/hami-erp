import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ShopAuthDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  shopId!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}
