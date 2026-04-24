import { ConfigService } from '@nestjs/config';
export type RedisRuntimeConfig = {
    url?: string;
    prefix: string;
    enabled: boolean;
};
export declare function getRedisRuntimeConfig(configService: ConfigService): RedisRuntimeConfig;
