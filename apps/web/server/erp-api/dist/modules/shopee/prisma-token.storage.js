"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaTokenStorage = void 0;
class PrismaTokenStorage {
    constructor(prisma, shopId) {
        this.prisma = prisma;
        this.shopId = shopId;
    }
    async store(token) {
        const expireAt = token.expired_at
            ? new Date(token.expired_at > 1_000_000_000_000
                ? token.expired_at
                : token.expired_at * 1000)
            : new Date(Date.now() + token.expire_in * 1000);
        await this.prisma.channelToken.upsert({
            where: {
                shopId: this.shopId,
            },
            create: {
                shopId: this.shopId,
                channel: 'SHOPEE',
                accessToken: token.access_token,
                refreshToken: token.refresh_token,
                expireAt,
                rawJson: token,
            },
            update: {
                accessToken: token.access_token,
                refreshToken: token.refresh_token,
                expireAt,
                rawJson: token,
            },
        });
    }
    async get() {
        const token = await this.prisma.channelToken.findUnique({
            where: {
                shopId: this.shopId,
            },
        });
        if (!token) {
            return null;
        }
        return {
            access_token: token.accessToken,
            refresh_token: token.refreshToken,
            expire_in: Math.max(0, Math.floor((token.expireAt.getTime() - Date.now()) / 1000)),
            expired_at: Math.floor(token.expireAt.getTime() / 1000),
            request_id: '',
            error: '',
            message: '',
            shop_id: Number(this.shopId),
        };
    }
    async clear() {
        await this.prisma.channelToken.deleteMany({
            where: {
                shopId: this.shopId,
            },
        });
    }
}
exports.PrismaTokenStorage = PrismaTokenStorage;
//# sourceMappingURL=prisma-token.storage.js.map