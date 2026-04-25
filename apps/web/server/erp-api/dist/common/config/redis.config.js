"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisRuntimeConfig = getRedisRuntimeConfig;
function getRedisRuntimeConfig(configService) {
    const url = configService.get('REDIS_URL');
    const prefix = configService.get('REDIS_PREFIX') || 'shopee-erp';
    return {
        url,
        prefix,
        enabled: Boolean(url),
    };
}
//# sourceMappingURL=redis.config.js.map