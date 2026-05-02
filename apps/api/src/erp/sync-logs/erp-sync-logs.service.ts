import { Injectable } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';

import { erpList } from '../common/erp-response';
import { ErpSyncLogQueryDto } from './dto/erp-sync-log-query.dto';

@Injectable()
export class ErpSyncLogsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listSyncLogs(query: ErpSyncLogQueryDto) {
    const records = await this.prismaService.jobRecord.findMany({
      where: {
        ...(query.type
          ? {
              jobName: {
                contains: query.type.toLowerCase(),
                mode: 'insensitive',
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    const data = records
      .filter((record) => {
        if (!query.shopId) return true;
        return this.getPayloadShopId(record.payload) === query.shopId;
      })
      .map((record) => {
        const payload = this.asRecord(record.payload);

        return {
          logId: record.id,
          triggerType: record.jobName,
          shopId: String(payload.shopId ?? ''),
          orderNo: String(payload.orderSn ?? ''),
          orderSn: String(payload.orderSn ?? ''),
          requestPayloadSummary: payload,
          resultStatus: this.toResultStatus(record.status),
          changedFields: [],
          message: record.errorMessage ?? undefined,
          createdAt: record.createdAt.toISOString(),
        };
      });

    return erpList(data, data.length);
  }

  private getPayloadShopId(payload: Prisma.JsonValue | null) {
    return String(this.asRecord(payload).shopId ?? '');
  }

  private asRecord(payload: Prisma.JsonValue | null): Record<string, unknown> {
    return payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  }

  private toResultStatus(status: JobStatus) {
    if (status === JobStatus.COMPLETED) return 'success';
    if (status === JobStatus.FAILED) return 'failed';
    return 'partial';
  }
}
