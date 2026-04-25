import { ConfigService } from '@nestjs/config';

export type RedisRuntimeConfig = {
  url?: string;
  prefix: string;
  enabled: boolean;
};

export function getRedisRuntimeConfig(
  configService: ConfigService,
): RedisRuntimeConfig {
  const url = configService.get<string>('REDIS_URL');
  const prefix = configService.get<string>('REDIS_PREFIX') || 'shopee-erp';

  return {
    url,
    prefix,
    enabled: Boolean(url),
  };
}
