import { PageQueryDto } from '../../common/dto/page-query.dto';
import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findMany(query: PageQueryDto, shopId?: string): Promise<{
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
