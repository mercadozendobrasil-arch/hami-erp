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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ShopeeController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeController = void 0;
const common_1 = require("@nestjs/common");
const shopee_service_1 = require("./shopee.service");
let ShopeeController = ShopeeController_1 = class ShopeeController {
    constructor(shopeeService) {
        this.shopeeService = shopeeService;
        this.logger = new common_1.Logger(ShopeeController_1.name);
    }
    getAuthorizationUrl() {
        return this.shopeeService.getAuthorizationUrl();
    }
    handlePushVerification(query) {
        this.logger.log(`Shopee push verification received: ${JSON.stringify(query)}`);
        return {
            success: true,
        };
    }
    async handlePushCallback(query, body, req) {
        const rawBody = typeof req.rawBody === 'string'
            ? req.rawBody
            : Buffer.isBuffer(req.rawBody)
                ? req.rawBody.toString('utf8')
                : undefined;
        this.logger.log(`Shopee push callback received | query=${JSON.stringify(query)}`);
        return this.shopeeService.handlePushCallback({
            query,
            body,
            headers: req.headers,
            rawBody,
        });
    }
    syncOrderDetail(body) {
        return this.shopeeService.syncOrderDetails(body);
    }
    syncOrderStatus(body) {
        return this.shopeeService.syncOrderStatuses(body);
    }
    syncRecentOrderDetails(body) {
        return this.shopeeService.syncRecentOrderDetails(body);
    }
    addInvoiceData(body) {
        return this.shopeeService.addInvoiceData(body);
    }
    createShippingDocument(body) {
        return this.shopeeService.createShippingDocument(body);
    }
    getShippingParameter(shopId, orderId, orderNo, orderSn, packageNumber) {
        return this.shopeeService.getShippingParameter({
            shopId,
            orderId,
            orderNo,
            orderSn,
            packageNumber,
        });
    }
    getMassShippingParameter(body) {
        return this.shopeeService.getMassShippingParameter(body);
    }
    shipOrder(body) {
        return this.shopeeService.shipOrder(body);
    }
    batchShipOrder(body) {
        return this.shopeeService.batchShipOrder(body);
    }
    massShipOrder(body) {
        return this.shopeeService.massShipOrder(body);
    }
    getTrackingNumber(shopId, orderId, orderNo, orderSn, packageNumber, responseOptionalFields) {
        return this.shopeeService.getTrackingNumber({
            shopId,
            orderId,
            orderNo,
            orderSn,
            packageNumber,
            responseOptionalFields,
        });
    }
    getMassTrackingNumber(body) {
        return this.shopeeService.getMassTrackingNumber(body);
    }
    getShippingDocumentParameter(shopId, orderId, orderNo, orderSn, packageNumber) {
        return this.shopeeService.getShippingDocumentParameter({
            shopId,
            orderId,
            orderNo,
            orderSn,
            packageNumber,
        });
    }
    updateShippingOrder(body) {
        return this.shopeeService.updateShippingOrder(body);
    }
    syncShippingDocumentResult(body) {
        return this.shopeeService.syncShippingDocumentResult(body);
    }
    getOrderSyncLogs(current, pageSize, shopId, orderNo, orderSn, packageNumber, triggerType, resultStatus, startTime, endTime) {
        return this.shopeeService.getOrderSyncLogs({
            current: current ? Number(current) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined,
            shopId,
            orderNo,
            orderSn,
            packageNumber,
            triggerType,
            resultStatus,
            startTime,
            endTime,
        });
    }
    getPackageContext(packageNumber) {
        return this.shopeeService.getPackageContext(packageNumber);
    }
    async downloadShippingDocument(packageNumber, shippingDocumentType, res) {
        const file = await this.shopeeService.downloadShippingDocument({
            packageNumber,
            shippingDocumentType,
        });
        res.setHeader('Content-Type', file.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
        return res.send(file.buffer);
    }
    async handleCallback(code, shopId, res) {
        try {
            const result = await this.shopeeService.handleAuthorizationCallback({
                code,
                shopId,
            });
            return res.redirect(result.redirectUrl);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Shopee authorization failed';
            this.logger.error(`Shopee auth callback failed for shop ${shopId ?? '-'}: ${message}`);
            const redirectUrl = this.shopeeService.buildAuthorizationFailureRedirect({
                shopId,
                message,
            });
            return res.redirect(common_1.HttpStatus.FOUND, redirectUrl);
        }
    }
};
exports.ShopeeController = ShopeeController;
__decorate([
    (0, common_1.Get)('auth/url'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "getAuthorizationUrl", null);
__decorate([
    (0, common_1.Get)('push'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "handlePushVerification", null);
__decorate([
    (0, common_1.Post)('push'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ShopeeController.prototype, "handlePushCallback", null);
__decorate([
    (0, common_1.Post)('orders/sync/detail'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "syncOrderDetail", null);
__decorate([
    (0, common_1.Post)('orders/sync/status'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "syncOrderStatus", null);
__decorate([
    (0, common_1.Post)('orders/sync/recent'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "syncRecentOrderDetails", null);
__decorate([
    (0, common_1.Post)('orders/invoice/add'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "addInvoiceData", null);
__decorate([
    (0, common_1.Post)('orders/shipping-document/create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "createShippingDocument", null);
__decorate([
    (0, common_1.Get)('orders/shipping-parameter'),
    __param(0, (0, common_1.Query)('shopId')),
    __param(1, (0, common_1.Query)('orderId')),
    __param(2, (0, common_1.Query)('orderNo')),
    __param(3, (0, common_1.Query)('orderSn')),
    __param(4, (0, common_1.Query)('packageNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "getShippingParameter", null);
__decorate([
    (0, common_1.Post)('orders/shipping-parameter/mass'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "getMassShippingParameter", null);
__decorate([
    (0, common_1.Post)('orders/ship'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "shipOrder", null);
__decorate([
    (0, common_1.Post)('orders/ship/batch'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "batchShipOrder", null);
__decorate([
    (0, common_1.Post)('orders/ship/mass'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "massShipOrder", null);
__decorate([
    (0, common_1.Get)('orders/tracking-number'),
    __param(0, (0, common_1.Query)('shopId')),
    __param(1, (0, common_1.Query)('orderId')),
    __param(2, (0, common_1.Query)('orderNo')),
    __param(3, (0, common_1.Query)('orderSn')),
    __param(4, (0, common_1.Query)('packageNumber')),
    __param(5, (0, common_1.Query)('responseOptionalFields')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "getTrackingNumber", null);
__decorate([
    (0, common_1.Post)('orders/tracking-number/mass'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "getMassTrackingNumber", null);
__decorate([
    (0, common_1.Get)('orders/shipping-document/parameter'),
    __param(0, (0, common_1.Query)('shopId')),
    __param(1, (0, common_1.Query)('orderId')),
    __param(2, (0, common_1.Query)('orderNo')),
    __param(3, (0, common_1.Query)('orderSn')),
    __param(4, (0, common_1.Query)('packageNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "getShippingDocumentParameter", null);
__decorate([
    (0, common_1.Post)('orders/shipping/update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "updateShippingOrder", null);
__decorate([
    (0, common_1.Post)('orders/shipping-document/result'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "syncShippingDocumentResult", null);
__decorate([
    (0, common_1.Get)('orders/sync/logs'),
    __param(0, (0, common_1.Query)('current')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('shopId')),
    __param(3, (0, common_1.Query)('orderNo')),
    __param(4, (0, common_1.Query)('orderSn')),
    __param(5, (0, common_1.Query)('packageNumber')),
    __param(6, (0, common_1.Query)('triggerType')),
    __param(7, (0, common_1.Query)('resultStatus')),
    __param(8, (0, common_1.Query)('startTime')),
    __param(9, (0, common_1.Query)('endTime')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "getOrderSyncLogs", null);
__decorate([
    (0, common_1.Get)('orders/package-context'),
    __param(0, (0, common_1.Query)('packageNumber')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ShopeeController.prototype, "getPackageContext", null);
__decorate([
    (0, common_1.Get)('orders/shipping-document/download'),
    __param(0, (0, common_1.Query)('packageNumber')),
    __param(1, (0, common_1.Query)('shippingDocumentType')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ShopeeController.prototype, "downloadShippingDocument", null);
__decorate([
    (0, common_1.Get)('auth/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('shop_id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ShopeeController.prototype, "handleCallback", null);
exports.ShopeeController = ShopeeController = ShopeeController_1 = __decorate([
    (0, common_1.Controller)('api/shopee'),
    __metadata("design:paramtypes", [shopee_service_1.ShopeeService])
], ShopeeController);
//# sourceMappingURL=shopee.controller.js.map