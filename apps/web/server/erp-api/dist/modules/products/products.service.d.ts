import { PrismaService } from '../database/prisma.service';
type ProductQuery = {
    current: number;
    pageSize: number;
    shopId?: string;
};
export declare class ProductsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findMany(query: ProductQuery): Promise<{
        data: {
            id: string;
            channel: "SHOPEE";
            siteCode: string;
            shopId: string;
            shopName: string;
            platformProductId: string;
            title: string;
            status: string;
            stock: number;
            price: string;
            updatedAt: string;
        }[];
        total: number;
        success: boolean;
        current: number;
        pageSize: number;
    }>;
}
export {};
