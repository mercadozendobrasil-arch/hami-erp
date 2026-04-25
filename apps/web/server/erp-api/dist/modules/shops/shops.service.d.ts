import { PrismaService } from '../database/prisma.service';
import { ShopeeService } from '../shopee/shopee.service';
type PageQuery = {
    current: number;
    pageSize: number;
};
export declare class ShopsService {
    private readonly prisma;
    private readonly shopeeService;
    constructor(prisma: PrismaService, shopeeService: ShopeeService);
    findMany(query: PageQuery): Promise<{
        data: {
            id: string;
            channel: "SHOPEE";
            siteCode: string;
            shopId: string;
            shopName: string;
            status: import(".prisma/client").$Enums.ShopStatus;
            tokenExpireAt: string | null;
            productCount: number;
            orderCount: number;
            updatedAt: string;
        }[];
        total: number;
        success: boolean;
        current: number;
        pageSize: number;
    }>;
    sync(shopId: string): Promise<{
        success: boolean;
        shopId: string;
        tokenRefreshed: boolean;
        productsSynced: number;
        ordersSynced: number;
    }>;
    syncProducts(shopId: string): Promise<{
        success: boolean;
        scope: string;
        shopId: string;
        tokenRefreshed: boolean;
        productsSynced: number;
    }>;
    syncOrders(shopId: string): Promise<{
        success: boolean;
        scope: string;
        shopId: string;
        tokenRefreshed: boolean;
        ordersSynced: number;
    }>;
}
export {};
