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
export declare function validateEnvironment(config: EnvRecord): AppEnvironment;
export {};
