import { PageQueryDto } from '../../common/dto/page-query.dto';
import { ShopsService } from './shops.service';
export declare class ShopsController {
    private readonly shopsService;
    constructor(shopsService: ShopsService);
    findMany(query: PageQueryDto): Promise<{
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
