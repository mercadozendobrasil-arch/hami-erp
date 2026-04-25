import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CategoryQueryDto } from './dto/category-query.dto';
import { ProductModelDto } from './dto/model.dto';
import { CreateProductDto } from './dto/product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { UpdatePriceDto, UpdateStockDto } from './dto/update-price-stock.dto';
import { ProductsService } from './products.service';

@ApiTags('shopee-products')
@Controller('shopee')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('categories')
  getCategories(@Query() query: CategoryQueryDto) {
    return this.productsService.listCategories(query.language);
  }

  @Get('categories/:categoryId/attributes')
  getCategoryAttributes(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() query: CategoryQueryDto,
  ) {
    return this.productsService.getCategoryAttributes(
      categoryId,
      query.language,
    );
  }

  @Get('categories/:categoryId/brands')
  getCategoryBrands(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.productsService.getCategoryBrands(categoryId);
  }

  @Get('categories/:categoryId/limits')
  getCategoryLimits(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.productsService.getCategoryLimits(categoryId);
  }

  @Get('shops/:shopId/products')
  listProducts(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.listProducts({ shopId, accessToken });
  }

  @Get('shops/:shopId/products/:itemId')
  getProduct(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.getProduct({ shopId, accessToken }, itemId);
  }

  @Post('shops/:shopId/products')
  createProduct(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() payload: CreateProductDto,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.createProduct({ shopId, accessToken }, payload);
  }

  @Put('shops/:shopId/products/:itemId')
  updateProduct(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() payload: CreateProductDto,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.updateProduct(
      { shopId, accessToken },
      itemId,
      payload,
    );
  }

  @Delete('shops/:shopId/products/:itemId')
  deleteProduct(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.deleteProduct({ shopId, accessToken }, itemId);
  }

  @Post('shops/:shopId/products/search')
  searchProducts(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() payload: SearchProductsDto,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.searchProducts(
      { shopId, accessToken },
      payload,
    );
  }

  @Post('shops/:shopId/products/:itemId/unlist')
  unlistProduct(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.unlistProduct({ shopId, accessToken }, itemId);
  }

  @Post('shops/:shopId/products/:itemId/sync')
  syncProduct(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.syncProduct({ shopId, accessToken }, itemId);
  }

  @Get('shops/:shopId/products/:itemId/models')
  getModelList(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.getModelList({ shopId, accessToken }, itemId);
  }

  @Post('shops/:shopId/products/:itemId/models')
  addModel(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() payload: ProductModelDto,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.addModel(
      { shopId, accessToken },
      itemId,
      payload,
    );
  }

  @Put('shops/:shopId/products/:itemId/models/:modelId')
  updateModel(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Param('modelId', ParseIntPipe) modelId: number,
    @Body() payload: ProductModelDto,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.updateModel(
      { shopId, accessToken },
      itemId,
      modelId,
      payload,
    );
  }

  @Delete('shops/:shopId/products/:itemId/models/:modelId')
  deleteModel(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Param('modelId', ParseIntPipe) modelId: number,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.deleteModel(
      { shopId, accessToken },
      itemId,
      modelId,
    );
  }

  @Post('shops/:shopId/products/update-price')
  updatePrice(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() payload: UpdatePriceDto,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.updatePrice({ shopId, accessToken }, payload);
  }

  @Post('shops/:shopId/products/update-stock')
  updateStock(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() payload: UpdateStockDto,
    @Query('accessToken') accessToken: string,
  ) {
    return this.productsService.updateStock({ shopId, accessToken }, payload);
  }
}
