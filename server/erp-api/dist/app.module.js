"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const runtime_config_module_1 = require("./common/config/runtime-config.module");
const prisma_module_1 = require("./modules/database/prisma.module");
const health_module_1 = require("./modules/health/health.module");
const orders_module_1 = require("./modules/orders/orders.module");
const products_module_1 = require("./modules/products/products.module");
const shopee_module_1 = require("./modules/shopee/shopee.module");
const shops_module_1 = require("./modules/shops/shops.module");
const env_validation_1 = require("./common/config/env.validation");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
                validate: env_validation_1.validateEnvironment,
            }),
            runtime_config_module_1.RuntimeConfigModule,
            prisma_module_1.DatabaseModule,
            health_module_1.HealthModule,
            shopee_module_1.ShopeeModule,
            shops_module_1.ShopsModule,
            products_module_1.ProductsModule,
            orders_module_1.OrdersModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map