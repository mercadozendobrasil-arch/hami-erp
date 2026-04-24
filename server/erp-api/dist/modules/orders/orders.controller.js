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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const page_query_dto_1 = require("../../common/dto/page-query.dto");
const orders_service_1 = require("./orders.service");
let OrdersController = class OrdersController {
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    findMany(query, shopId, orderNo, packageNumber, orderStatus, currentTab) {
        return this.ordersService.findMany({
            ...query,
            shopId,
            orderNo,
            packageNumber,
            orderStatus,
            currentTab,
        });
    }
    getOverview(shopId, currentTab) {
        return this.ordersService.getOverview({
            shopId,
            currentTab,
        });
    }
    findLogisticsMany(query, shopId, orderNo, packageNumber, logisticsChannel, logisticsStatus, shippingDocumentStatus) {
        return this.ordersService.findLogisticsMany({
            ...query,
            shopId,
            orderNo,
            packageNumber,
            logisticsChannel,
            logisticsStatus,
            shippingDocumentStatus,
        });
    }
    findPackagePrecheckMany(query, shopId, orderNo, orderSn, packageNumber, logisticsProfile, logisticsChannelId, logisticsChannelName, shippingCarrier, packageStatus, logisticsStatus, shippingDocumentStatus, canShip, startTime, endTime, timeField) {
        return this.ordersService.findPackagePrecheckMany({
            ...query,
            shopId,
            orderNo,
            orderSn,
            packageNumber,
            logisticsProfile,
            logisticsChannelId,
            logisticsChannelName,
            shippingCarrier,
            packageStatus,
            logisticsStatus,
            shippingDocumentStatus,
            canShip,
            startTime,
            endTime,
            timeField,
        });
    }
    findOne(id) {
        return this.ordersService.findOne(id);
    }
    audit(body) {
        return this.ordersService.auditOrders(body);
    }
    reverseAudit(body) {
        return this.ordersService.reverseAuditOrders(body);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('shopId')),
    __param(2, (0, common_1.Query)('orderNo')),
    __param(3, (0, common_1.Query)('packageNumber')),
    __param(4, (0, common_1.Query)('orderStatus')),
    __param(5, (0, common_1.Query)('currentTab')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [page_query_dto_1.PageQueryDto, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findMany", null);
__decorate([
    (0, common_1.Get)('overview'),
    __param(0, (0, common_1.Query)('shopId')),
    __param(1, (0, common_1.Query)('currentTab')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('packages/logistics'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('shopId')),
    __param(2, (0, common_1.Query)('orderNo')),
    __param(3, (0, common_1.Query)('packageNumber')),
    __param(4, (0, common_1.Query)('logisticsChannel')),
    __param(5, (0, common_1.Query)('logisticsStatus')),
    __param(6, (0, common_1.Query)('shippingDocumentStatus')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [page_query_dto_1.PageQueryDto, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findLogisticsMany", null);
__decorate([
    (0, common_1.Get)('packages/precheck'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('shopId')),
    __param(2, (0, common_1.Query)('orderNo')),
    __param(3, (0, common_1.Query)('orderSn')),
    __param(4, (0, common_1.Query)('packageNumber')),
    __param(5, (0, common_1.Query)('logisticsProfile')),
    __param(6, (0, common_1.Query)('logisticsChannelId')),
    __param(7, (0, common_1.Query)('logisticsChannelName')),
    __param(8, (0, common_1.Query)('shippingCarrier')),
    __param(9, (0, common_1.Query)('packageStatus')),
    __param(10, (0, common_1.Query)('logisticsStatus')),
    __param(11, (0, common_1.Query)('shippingDocumentStatus')),
    __param(12, (0, common_1.Query)('canShip')),
    __param(13, (0, common_1.Query)('startTime')),
    __param(14, (0, common_1.Query)('endTime')),
    __param(15, (0, common_1.Query)('timeField')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [page_query_dto_1.PageQueryDto, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findPackagePrecheckMany", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('audit'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "audit", null);
__decorate([
    (0, common_1.Post)('reverse-audit'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "reverseAudit", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('api/orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map