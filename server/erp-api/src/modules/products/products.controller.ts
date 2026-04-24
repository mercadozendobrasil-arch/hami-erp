import { Controller, Get, Query } from '@nestjs/common';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { ProductsService } from './products.service';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findMany(
    @Query() query: PageQueryDto,
    @Query('shopId') shopId?: string,
  ) {
    return this.productsService.findMany({
      ...query,
      shopId,
    });
  }
}
