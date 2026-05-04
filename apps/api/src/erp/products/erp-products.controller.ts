import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import {
  BindErpSkuMappingDto,
  CreateErpProductDto,
  UpdateOnlineErpProductDto,
} from './dto/erp-product.dto';
import { ErpProductQueryDto, ErpSkuQueryDto } from './dto/erp-product-query.dto';
import { ErpProductsService } from './erp-products.service';

@Controller('erp/products')
export class ErpProductsController {
  constructor(private readonly erpProductsService: ErpProductsService) {}

  @Get()
  listProducts(@Query() query: ErpProductQueryDto) {
    return this.erpProductsService.listProducts(query);
  }

  @Post()
  createProduct(@Body() payload: CreateErpProductDto) {
    return this.erpProductsService.createProduct(payload);
  }

  @Get('sku-mappings/missing')
  listMissingSkuMappings(
    @Query('shopId') shopId?: string,
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.erpProductsService.listMissingSkuMappings({
      shopId,
      current: current ? Number(current) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post('sku-mappings/bind')
  bindSkuMapping(@Body() payload: BindErpSkuMappingDto) {
    return this.erpProductsService.bindSkuMapping(payload);
  }

  @Get('skus')
  listSkus(@Query() query: ErpSkuQueryDto) {
    return this.erpProductsService.listSkus(query);
  }

  @Post('sync-remote')
  syncRemoteProducts(@Query('shopId') shopId: string) {
    return this.erpProductsService.syncRemoteProducts(shopId);
  }

  @Get(':productId/online')
  getOnlineProduct(
    @Param('productId') productId: string,
    @Query('shopId') shopId: string,
  ) {
    return this.erpProductsService.getOnlineProduct(productId, shopId);
  }

  @Get(':productId')
  getProduct(
    @Param('productId') productId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.erpProductsService.getProduct(productId, shopId);
  }

  @Post(':productId/sync')
  syncProduct(
    @Param('productId') productId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.erpProductsService.syncProduct(productId, shopId);
  }

  @Patch(':productId/online')
  updateOnlineProduct(
    @Param('productId') productId: string,
    @Body() payload: UpdateOnlineErpProductDto,
  ) {
    return this.erpProductsService.updateOnlineProduct(productId, payload);
  }

  @Post(':productId/unlist')
  unlistProduct(
    @Param('productId') productId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.erpProductsService.unlistProduct(productId, shopId);
  }

  @Post(':productId/relist')
  relistProduct(
    @Param('productId') productId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.erpProductsService.relistProduct(productId, shopId);
  }
}
