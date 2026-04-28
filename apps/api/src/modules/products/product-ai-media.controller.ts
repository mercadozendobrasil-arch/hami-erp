import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  BindProductMediaUsageDto,
  CreateProductAiTaskDto,
  EditProductAiAssetDto,
  SwitchProductAiAssetVersionDto,
  UploadProductMediaDto,
} from './dto/product-ai-media.dto';
import { ProductAiMediaService } from './product-ai-media.service';

@ApiTags('product-ai-media')
@Controller()
export class ProductAiMediaController {
  constructor(private readonly productAiMediaService: ProductAiMediaService) {}

  @Post('product/media/upload')
  uploadMedia(@Body() payload: UploadProductMediaDto) {
    return this.productAiMediaService.uploadMedia(payload);
  }

  @Get('product/:productId/media/list')
  listMedia(
    @Param('productId') productId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.productAiMediaService.listMedia(productId, tenantId);
  }

  @Get('product/:productId/ai-assets')
  listAssets(
    @Param('productId') productId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.productAiMediaService.listAssets(productId, tenantId);
  }

  @Get('product/:productId/ai-tasks')
  listTasks(
    @Param('productId') productId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.productAiMediaService.listTasks(productId, tenantId);
  }

  @Post('product/:productId/media/usage/bind')
  bindUsage(
    @Param('productId') productId: string,
    @Body() payload: BindProductMediaUsageDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.productAiMediaService.bindUsage(productId, payload, tenantId);
  }

  @Post('product/:productId/media/usage/unbind')
  unbindUsage(@Body('usageId') usageId: string) {
    return this.productAiMediaService.unbindUsage(usageId);
  }

  @Delete('product/media/usage/:usageId')
  deleteUsage(@Param('usageId') usageId: string) {
    return this.productAiMediaService.unbindUsage(usageId);
  }

  @Post('ai/product/tasks/create')
  createTask(@Body() payload: CreateProductAiTaskDto) {
    return this.productAiMediaService.createTask(payload);
  }

  @Get('ai/product/tasks/:taskId')
  getTask(@Param('taskId') taskId: string) {
    return this.productAiMediaService.getTask(taskId);
  }

  @Get('ai/product/tasks/:taskId/results')
  getTaskResults(@Param('taskId') taskId: string) {
    return this.productAiMediaService.getTaskResults(taskId);
  }

  @Post('ai/product/tasks/:taskId/mock-result')
  createTaskMockResult(
    @Param('taskId') taskId: string,
    @Body('fileUrl') fileUrl: string,
    @Body('createdBy') createdBy?: string,
  ) {
    return this.productAiMediaService.createPlaceholderAssetForTask(
      taskId,
      fileUrl,
      createdBy,
    );
  }

  @Post('ai/product/assets/:assetId/regenerate')
  regenerateAsset(
    @Param('assetId') assetId: string,
    @Body() payload: EditProductAiAssetDto,
  ) {
    return this.productAiMediaService.editAsset(assetId, payload);
  }

  @Post('ai/product/assets/:assetId/edit')
  editAsset(
    @Param('assetId') assetId: string,
    @Body() payload: EditProductAiAssetDto,
  ) {
    return this.productAiMediaService.editAsset(assetId, payload);
  }

  @Get('ai/product/assets/:assetId/versions')
  getAssetVersions(@Param('assetId') assetId: string) {
    return this.productAiMediaService.getAssetVersions(assetId);
  }

  @Post('ai/product/assets/:assetId/versions/:versionId/switch')
  switchAssetVersion(
    @Param('assetId') assetId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.productAiMediaService.switchVersion(assetId, versionId);
  }

  @Post('ai/product/assets/:assetId/versions/switch')
  switchAssetVersionByBody(
    @Param('assetId') assetId: string,
    @Body() payload: SwitchProductAiAssetVersionDto,
  ) {
    return this.productAiMediaService.switchVersion(assetId, payload.versionId);
  }
}
