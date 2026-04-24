type EnvRecord = Record<string, string | undefined>;

export type AppEnvironment = {
  PORT: number;
  DATABASE_URL: string;
  FRONTEND_URL: string;
  SHOPEE_PARTNER_ID: string;
  SHOPEE_PARTNER_KEY: string;
  SHOPEE_REGION: string;
  SHOPEE_REDIRECT_URL: string;
  REDIS_URL?: string;
  REDIS_PREFIX: string;
};

function normalizeValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readFrontendUrl(config: EnvRecord) {
  return normalizeValue(config.FRONTEND_URL) ?? normalizeValue(config.ERP_FRONTEND_URL);
}

export function validateEnvironment(config: EnvRecord): AppEnvironment {
  const missing: string[] = [];
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
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Copy server/erp-api/.env.example to .env and fill in the required values before starting the ERP API.',
    );
  }

  return {
    PORT: port,
    DATABASE_URL: databaseUrl as string,
    FRONTEND_URL: frontendUrl as string,
    SHOPEE_PARTNER_ID: shopeePartnerId as string,
    SHOPEE_PARTNER_KEY: shopeePartnerKey as string,
    SHOPEE_REGION: shopeeRegion as string,
    SHOPEE_REDIRECT_URL: shopeeRedirectUrl as string,
    REDIS_URL: normalizeValue(config.REDIS_URL),
    REDIS_PREFIX: normalizeValue(config.REDIS_PREFIX) || 'shopee-erp',
  };
}
