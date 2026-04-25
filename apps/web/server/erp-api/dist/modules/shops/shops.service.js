"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const shopee_service_1 = require("../shopee/shopee.service");
let ShopsService = class ShopsService {
    constructor(prisma, shopeeService) {
        this.prisma = prisma;
        this.shopeeService = shopeeService;
    }
    async findMany(query) {
        const skip = (query.current - 1) * query.pageSize;
        const [rows, total] = await this.prisma.$transaction([
            this.prisma.channelShop.findMany({
                include: {
                    token: true,
                    _count: {
                        select: {
                            products: true,
                            orders: true,
                        },
                    },
                },
                orderBy: {
                    updatedAt: 'desc',
                },
                skip,
                take: query.pageSize,
            }),
            this.prisma.channelShop.count(),
        ]);
        return {
            data: rows.map((row) => ({
                id: row.id,
                channel: row.channel,
                siteCode: row.siteCode,
                shopId: row.shopId,
                shopName: row.shopName,
                status: row.status,
                tokenExpireAt: row.token?.expireAt.toISOString() || null,
                productCount: row._count.products,
                orderCount: row._count.orders,
                updatedAt: row.updatedAt.toISOString(),
            })),
            total,
            success: true,
            current: query.current,
            pageSize: query.pageSize,
        };
    }
    async sync(shopId) {
        return this.shopeeService.syncAuthorizedShop(shopId);
    }
    async syncProducts(shopId) {
        return this.shopeeService.syncShopProducts(shopId);
    }
    async syncOrders(shopId) {
        return this.shopeeService.syncShopOrders(shopId);
    }
};
exports.ShopsService = ShopsService;
exports.ShopsService = ShopsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopee_service_1.ShopeeService])
], ShopsService);
//# sourceMappingURL=shops.service.js.map