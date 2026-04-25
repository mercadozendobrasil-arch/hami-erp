import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';

const DOMAIN_QUEUE_PREFIX: Record<string, string[]> = {
  orders: ['order'],
  products: ['product'],
};

@Injectable()
export class ErpJobsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getJob(jobId: string) {
    const job = await this.prismaService.jobRecord.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('JobRecord not found.');
    }

    return {
      success: true,
      data: job,
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
}
