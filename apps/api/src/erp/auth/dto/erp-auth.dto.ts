import { IsString, MinLength } from 'class-validator';

export class ErpLoginDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
