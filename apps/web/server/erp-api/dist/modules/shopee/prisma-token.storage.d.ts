import { PrismaService } from '../database/prisma.service';
type ShopeeAccessToken = {
    refresh_token: string;
    access_token: string;
    expire_in: number;
    request_id: string;
    error: string;
    message: string;
    shop_id?: number;
    expired_at?: number;
};
type ShopeeTokenStorage = {
    store(token: ShopeeAccessToken): Promise<void>;
    get(): Promise<ShopeeAccessToken | null>;
    clear(): Promise<void>;
};
export declare class PrismaTokenStorage implements ShopeeTokenStorage {
    private readonly prisma;
    private readonly shopId;
    constructor(prisma: PrismaService, shopId: string);
    store(token: ShopeeAccessToken): Promise<void>;
    get(): Promise<ShopeeAccessToken | null>;
    clear(): Promise<void>;
}
export {};
