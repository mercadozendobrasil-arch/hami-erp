import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { JobStatus } from '@prisma/client';

import {
  SHOPEE_AUTH_REFRESH_JOB,
  SHOPEE_AUTH_REFRESH_QUEUE,
  SHOPEE_REFRESH_TOKEN_TTL_SECONDS,
  SHOPEE_REFRESH_LEEWAY_MS,
} from 'src/common/shopee.constants';
import { ShopeeTokenService } from 'src/common/shopee-token.service';
import { AuthSdk } from 'src/shopee-sdk/modules/auth.sdk';
import { PrismaService } from 'src/infra/database/prisma.service';

interface RefreshJobPayload {
  shopId: string;
}

@Injectable()
export class ShopeeAuthRefreshQueueService {
  constructor(
    @InjectQueue(SHOPEE_AUTH_REFRESH_QUEUE)
    private readonly queue: Queue<RefreshJobPayload>,
    private readonly prisma: PrismaService,
  ) {}

  async schedule(shopId: bigint, accessTokenExpiresAt: Date) {
    const delay = Math.max(
      accessTokenExpiresAt.getTime() - Date.now() - SHOPEE_REFRESH_LEEWAY_MS,
      1000,
    );
    const jobId = this.createJobId(shopId);
    const existingJob = await this.queue.getJob(jobId);

    await this.prisma.jobRecord.create({
      data: {
        queueName: SHOPEE_AUTH_REFRESH_QUEUE,
        jobName: SHOPEE_AUTH_REFRESH_JOB,
        status: JobStatus.PENDING,
        payload: {
          shopId: shopId.toString(),
          scheduledFor: accessTokenExpiresAt.toISOString(),
        },
      },
    });

    await existingJob?.remove();

    await this.queue.add(
      SHOPEE_AUTH_REFRESH_JOB,
      {
        shopId: shopId.toString(),
      },
      {
        jobId,
        delay,
        removeOnComplete: 20,
        removeOnFail: 20,
      },
    );
  }

  private createJobId(shopId: bigint) {
    return `shopee-auth-refresh:${shopId.toString()}`;
  }
}

@Processor(SHOPEE_AUTH_REFRESH_QUEUE)
export class ShopeeAuthRefreshProcessor extends WorkerHost {
  constructor(
    private readonly authSdk: AuthSdk,
    private readonly tokenService: ShopeeTokenService,
    private readonly queueService: ShopeeAuthRefreshQueueService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<RefreshJobPayload>) {
    await this.prisma.jobRecord.create({
      data: {
        queueName: SHOPEE_AUTH_REFRESH_QUEUE,
        jobName: job.name,
        status: JobStatus.PROCESSING,
        payload: {
          shopId: job.data.shopId,
          jobId: job.id?.toString() ?? null,
        },
      },
    });

    try {
      const shopId = BigInt(job.data.shopId);
      const { token, shop } =
        await this.tokenService.findRequiredTokenByShopId(shopId);
      const refreshed = await this.authSdk.refreshAccessToken({
        shopId,
        refreshToken: token.refreshToken,
      });

      const saved = await this.tokenService.saveTokens({
        shopId,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        accessTokenExpiresAt: new Date(Date.now() + refreshed.expire_in * 1000),
        refreshTokenExpiresAt: new Date(
          Date.now() + SHOPEE_REFRESH_TOKEN_TTL_SECONDS * 1000,
        ),
        region: shop.region,
        shopName: shop.shopName,
      });

      await this.queueService.schedule(
        shopId,
        saved.token.accessTokenExpiresAt ?? new Date(),
      );

      await this.prisma.jobRecord.create({
        data: {
          queueName: SHOPEE_AUTH_REFRESH_QUEUE,
          jobName: job.name,
          status: JobStatus.COMPLETED,
          payload: {
            shopId: job.data.shopId,
          },
          result: {
            accessTokenExpiresAt:
              saved.token.accessTokenExpiresAt?.toISOString() ?? null,
          },
          processedAt: new Date(),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown token refresh error.';

      await this.prisma.jobRecord.create({
        data: {
          queueName: SHOPEE_AUTH_REFRESH_QUEUE,
          jobName: job.name,
          status: JobStatus.FAILED,
          payload: {
            shopId: job.data.shopId,
          },
          errorMessage: message,
          processedAt: new Date(),
        },
      });

      throw error;
    }
  }
}
