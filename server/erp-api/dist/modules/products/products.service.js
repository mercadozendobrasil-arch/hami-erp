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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let ProductsService = class ProductsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findMany(query) {
        const skip = (query.current - 1) * query.pageSize;
        const where = query.shopId
            ? {
                shopId: query.shopId,
            }
            : undefined;
        const [rows, total] = await this.prisma.$transaction([
            this.prisma.erpProduct.findMany({
                where,
                include: {
                    shop: true,
                },
                orderBy: {
                    updatedAt: 'desc',
                },
                skip,
                take: query.pageSize,
            }),
            this.prisma.erpProduct.count({ where }),
        ]);
        return {
            data: rows.map((row) => ({
                id: row.id,
                channel: row.channel,
                siteCode: row.siteCode,
                shopId: row.shopId,
                shopName: row.shop.shopName,
                platformProductId: row.platformProductId,
                title: row.title,
                status: row.status,
                stock: row.stock,
                price: row.price.toString(),
                updatedAt: row.updatedAt.toISOString(),
            })),
            total,
            success: true,
            current: query.current,
            pageSize: query.pageSize,
        };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map