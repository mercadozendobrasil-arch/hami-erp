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
exports.RuntimeConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const redis_config_1 = require("./redis.config");
let RuntimeConfigService = class RuntimeConfigService {
    constructor(configService) {
        this.configService = configService;
    }
    getFrontendBaseUrl() {
        return this.configService.getOrThrow('FRONTEND_URL');
    }
    getShopeeRedirectUrl() {
        return this.configService.getOrThrow('SHOPEE_REDIRECT_URL');
    }
    getShopeePartnerId() {
        return this.configService.getOrThrow('SHOPEE_PARTNER_ID');
    }
    getShopeePartnerKey() {
        return this.configService.getOrThrow('SHOPEE_PARTNER_KEY');
    }
    getRedisConfig() {
        return (0, redis_config_1.getRedisRuntimeConfig)(this.configService);
    }
    buildFrontendCallbackUrl(params) {
        const redirect = new URL('/shop/auth', this.getFrontendBaseUrl());
        Object.entries(params).forEach(([key, value]) => {
            redirect.searchParams.set(key, value);
        });
        return redirect.toString();
    }
};
exports.RuntimeConfigService = RuntimeConfigService;
exports.RuntimeConfigService = RuntimeConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RuntimeConfigService);
//# sourceMappingURL=runtime-config.service.js.map