import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../infra/database/prisma.service';
import {
  BindProductMediaUsageDto,
  CreateProductAiTaskDto,
  EditProductAiAssetDto,
  UploadProductMediaDto,
} from './dto/product-ai-media.dto';
import {
  buildProductAiTaskNo,
  buildPrompt,
  inferAssetType,
  toPrismaMediaType,
  toPrismaSourceType,
  toPrismaTaskType,
  toPrismaUsageType,
} from './product-ai-media.mapper';

@Injectable()
export class ProductAiMediaService {
  constructor(private readonly prisma: PrismaService) {}

  listMedia(productId: string, tenantId = 'default') {
    return this.prisma.productMedia.findMany({
      where: { productId, tenantId, status: 'enabled' },
      orderBy: [{ sortNo: 'asc' }, { createdAt: 'desc' }],
    });
  }

  uploadMedia(input: UploadProductMediaDto) {
    return this.prisma.productMedia.create({
      data: {
        tenantId: input.tenantId ?? 'default',
        productId: input.productId,
        mediaType: toPrismaMediaType(input.mediaType) as never,
        sourceType: toPrismaSourceType(input.sourceType) as never,
        fileUrl: input.fileUrl,
        thumbnailUrl: input.thumbnailUrl,
        fileName: input.fileName,
        sortNo: input.sortNo ?? 0,
        isMain: input.isMain ?? false,
        createdBy: input.createdBy ?? 'system',
      },
    });
  }

  listAssets(productId: string, tenantId = 'default') {
    return this.prisma.productAiAsset.findMany({
      where: { productId, tenantId },
      include: {
        versions: { orderBy: { versionNo: 'desc' } },
        usages: { where: { status: 'active' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listTasks(productId: string, tenantId = 'default') {
    return this.prisma.productAiTask.findMany({
      where: { productId, tenantId },
      include: { assets: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(input: CreateProductAiTaskDto) {
    const tenantId = input.tenantId ?? 'default';
    const createdBy = input.createdBy ?? 'system';
    const promptText = buildPrompt(input);

    return this.prisma.productAiTask.create({
      data: {
        tenantId,
        taskNo: buildProductAiTaskNo(),
        productId: input.productId,
        taskType: toPrismaTaskType(input.taskType) as never,
        status: 'QUEUED' as never,
        progress: 0,
        sourceMediaIds: input.sourceMediaIds,
        inputSnapshotJson: {
          stylePreference: input.stylePreference,
          bizGoal: input.bizGoal,
          extraPrompt: input.extraPrompt,
        },
        promptText,
        totalCount: input.totalCount ?? 1,
        createdBy,
      },
    });
  }

  getTask(taskId: string) {
    return this.prisma.productAiTask.findUnique({
      where: { id: taskId },
      include: { assets: { include: { versions: true } } },
    });
  }

  getTaskResults(taskId: string) {
    return this.prisma.productAiAsset.findMany({
      where: { taskId },
      include: { versions: { orderBy: { versionNo: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async editAsset(assetId: string, input: EditProductAiAssetDto) {
    const asset = await this.prisma.productAiAsset.findUnique({
      where: { id: assetId },
      include: { versions: { orderBy: { versionNo: 'desc' }, take: 1 } },
    });
    if (!asset) throw new NotFoundException('AI asset not found');

    const nextVersionNo = (asset.versions[0]?.versionNo ?? 0) + 1;
    const fileUrl = input.fileUrl ?? asset.versions[0]?.fileUrl;
    if (!fileUrl) throw new NotFoundException('No source file found for edit');

    return this.prisma.$transaction(async (tx) => {
      await tx.productAiAssetVersion.updateMany({
        where: { assetId },
        data: { isCurrent: false },
      });
      const version = await tx.productAiAssetVersion.create({
        data: {
          tenantId: asset.tenantId,
          assetId,
          versionNo: nextVersionNo,
          parentVersionId: asset.currentVersionId,
          versionType: 'FULL_EDIT' as never,
          editPrompt: input.editPrompt,
          fileUrl,
          thumbnailUrl: input.thumbnailUrl,
          isCurrent: true,
          createdBy: input.createdBy ?? 'system',
        },
      });
      return tx.productAiAsset.update({
        where: { id: assetId },
        data: { currentVersionId: version.id },
        include: { versions: true },
      });
    });
  }

  async switchVersion(assetId: string, versionId: string) {
    const version = await this.prisma.productAiAssetVersion.findFirst({
      where: { id: versionId, assetId },
    });
    if (!version) throw new NotFoundException('AI asset version not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.productAiAssetVersion.updateMany({
        where: { assetId },
        data: { isCurrent: false },
      });
      await tx.productAiAssetVersion.update({
        where: { id: versionId },
        data: { isCurrent: true },
      });
      return tx.productAiAsset.update({
        where: { id: assetId },
        data: { currentVersionId: versionId },
        include: { versions: true },
      });
    });
  }

  async bindUsage(productId: string, input: BindProductMediaUsageDto, tenantId = 'default') {
    return this.prisma.productMediaUsage.create({
      data: {
        tenantId,
        productId,
        assetId: input.assetId,
        versionId: input.versionId,
        usageType: toPrismaUsageType(input.usageType) as never,
        usageTarget: input.usageTarget,
        sortNo: input.sortNo ?? 0,
        createdBy: input.createdBy ?? 'system',
      },
    });
  }

  unbindUsage(usageId: string) {
    return this.prisma.productMediaUsage.update({
      where: { id: usageId },
      data: { status: 'inactive' },
    });
  }

  async createPlaceholderAssetForTask(taskId: string, fileUrl: string, createdBy = 'system') {
    const task = await this.prisma.productAiTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('AI task not found');

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.productAiAsset.create({
        data: {
          tenantId: task.tenantId,
          productId: task.productId,
          taskId,
          assetType: inferAssetType(String(task.taskType)) as never,
          assetName: `AI素材-${task.taskNo}`,
          createdBy,
        },
      });
      const version = await tx.productAiAssetVersion.create({
        data: {
          tenantId: task.tenantId,
          assetId: asset.id,
          versionNo: 1,
          versionType: 'INITIAL' as never,
          fileUrl,
          isCurrent: true,
          createdBy,
        },
      });
      return tx.productAiAsset.update({
        where: { id: asset.id },
        data: { currentVersionId: version.id },
        include: { versions: true },
      });
    });
  }
}
