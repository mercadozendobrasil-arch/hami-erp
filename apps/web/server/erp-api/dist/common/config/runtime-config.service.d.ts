import { ConfigService } from '@nestjs/config';
import { type RedisRuntimeConfig } from './redis.config';
export declare class RuntimeConfigService {
    private readonly configService;
    constructor(configService: ConfigService);
    getFrontendBaseUrl(): string;
    getShopeeRedirectUrl(): string;
    getShopeePartnerId(): string;
    getShopeePartnerKey(): string;
    getRedisConfig(): RedisRuntimeConfig;
    buildFrontendCallbackUrl(params: Record<string, string>): string;
}
