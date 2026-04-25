import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const startedAt = new Date().toISOString();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        success: true,
        status: 'ok',
        service: 'erp-api',
        timestamp: startedAt,
        database: {
          status: 'up',
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error';

      return {
        success: false,
        status: 'degraded',
        service: 'erp-api',
        timestamp: startedAt,
        database: {
          status: 'down',
          message,
        },
      };
    }
  }
}
