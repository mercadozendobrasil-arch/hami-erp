import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';

const DOMAIN_QUEUE_PREFIX: Record<string, string[]> = {
  orders: ['order'],
  products: ['product'],
};

@Injectable()
export class ErpJobsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getJob(jobId: string) {
    const job = await this.findJob(jobId);

    return {
      success: true,
      data: job,
    };
  }

  async getProcess(jobId: string) {
    const job = await this.findJob(jobId);
    const result = this.asRecord(job.result);
    const failList = this.asArray(result.failList);
    const successList = this.asArray(result.successList);
    const processedNum = this.asNumber(result.processedNum, successList.length + failList.length);
    const totalNum = this.asNumber(result.totalNum, processedNum);

    return {
      success: true,
      data: {
        uuid: job.id,
        taskId: job.id,
        status: job.status,
        processMsg: {
          code: job.status === JobStatus.COMPLETED ? 1 : job.status === JobStatus.FAILED ? -1 : 0,
          status: job.status,
          totalNum,
          processedNum,
          successList,
          failList,
          message: job.errorMessage || String(result.message || ''),
          data: result,
        },
        raw: job,
      },
    };
  }

  async listJobs(domain?: string) {
    const where: Prisma.JobRecordWhereInput = {};
    const prefixes = domain ? DOMAIN_QUEUE_PREFIX[domain] : undefined;

    if (prefixes?.length) {
      where.OR = prefixes.flatMap((prefix) => [
        { queueName: { contains: prefix, mode: 'insensitive' } },
        { jobName: { contains: prefix, mode: 'insensitive' } },
      ]);
    }

    const data = await this.prismaService.jobRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data,
      total: data.length,
    };
  }

  private async findJob(jobId: string) {
    const job = await this.prismaService.jobRecord.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('JobRecord not found.');
    }

    return job;
  }

  private asRecord(input: Prisma.JsonValue | null): Record<string, unknown> {
    return input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  }

  private asArray(input: unknown): unknown[] {
    return Array.isArray(input) ? input : [];
  }

  private asNumber(input: unknown, fallback: number) {
    const value = Number(input);
    return Number.isFinite(value) ? value : fallback;
  }
}
