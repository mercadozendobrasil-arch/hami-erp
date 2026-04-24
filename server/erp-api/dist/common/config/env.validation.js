"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
function normalizeValue(value) {
    if (!value) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}
function readFrontendUrl(config) {
    return normalizeValue(config.FRONTEND_URL) ?? normalizeValue(config.ERP_FRONTEND_URL);
}
function validateEnvironment(config) {
    const missing = [];
    const port = Number(config.PORT || 3001);
    if (Number.isNaN(port) || port <= 0) {
        throw new Error('Invalid environment variable PORT: must be a positive number.');
    }
    const databaseUrl = normalizeValue(config.DATABASE_URL);
    const frontendUrl = readFrontendUrl(config);
    const shopeePartnerId = normalizeValue(config.SHOPEE_PARTNER_ID);
    const shopeePartnerKey = normalizeValue(config.SHOPEE_PARTNER_KEY);
    const shopeeRegion = normalizeValue(config.SHOPEE_REGION);
    const shopeeRedirectUrl = normalizeValue(config.SHOPEE_REDIRECT_URL);
    if (!databaseUrl) {
        missing.push('DATABASE_URL');
    }
    if (!frontendUrl) {
        missing.push('FRONTEND_URL (or ERP_FRONTEND_URL)');
    }
    if (!shopeePartnerId) {
        missing.push('SHOPEE_PARTNER_ID');
    }
    if (!shopeePartnerKey) {
        missing.push('SHOPEE_PARTNER_KEY');
    }
    if (!shopeeRegion) {
        missing.push('SHOPEE_REGION');
    }
    if (!shopeeRedirectUrl) {
        missing.push('SHOPEE_REDIRECT_URL');
    }
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}. ` +
            'Copy server/erp-api/.env.example to .env and fill in the required values before starting the ERP API.');
    }
    return {
        PORT: port,
        DATABASE_URL: databaseUrl,
        FRONTEND_URL: frontendUrl,
        SHOPEE_PARTNER_ID: shopeePartnerId,
        SHOPEE_PARTNER_KEY: shopeePartnerKey,
        SHOPEE_REGION: shopeeRegion,
        SHOPEE_REDIRECT_URL: shopeeRedirectUrl,
        REDIS_URL: normalizeValue(config.REDIS_URL),
        REDIS_PREFIX: normalizeValue(config.REDIS_PREFIX) || 'shopee-erp',
    };
}
//# sourceMappingURL=env.validation.js.map