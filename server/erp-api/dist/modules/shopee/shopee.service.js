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
var ShopeeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const runtime_config_service_1 = require("../../common/config/runtime-config.service");
const prisma_service_1 = require("../database/prisma.service");
const prisma_token_storage_1 = require("./prisma-token.storage");
const FULL_ORDER_DETAIL_FIELDS = 'buyer_user_id,buyer_username,estimated_shipping_fee,recipient_address,actual_shipping_fee,note,note_update_time,item_list,pay_time,split_up,buyer_cancel_reason,cancel_by,cancel_reason,actual_shipping_fee_confirmed,buyer_cpf_id,fulfillment_flag,pickup_done_time,package_list,shipping_carrier,payment_method,total_amount,invoice_data,order_chargeable_weight_gram,return_request_due_date,edt';
const TRACKING_RESPONSE_OPTIONAL_FIELDS = 'plp_number,first_mile_tracking_number,last_mile_tracking_number';
const TRACKING_RETRY_INTERVAL_MS = 5 * 60 * 1000;
const TRACKING_RETRY_MAX_ATTEMPTS = 3;
let ShopeeService = ShopeeService_1 = class ShopeeService {
    constructor(runtimeConfigService, prisma) {
        this.runtimeConfigService = runtimeConfigService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(ShopeeService_1.name);
        this.authPartnerPath = '/api/v2/shop/auth_partner';
        this.scheduledTrackingRetryTimers = new Map();
    }
    async getAuthorizationUrl() {
        const redirectUrl = this.runtimeConfigService.getShopeeRedirectUrl();
        const redis = this.runtimeConfigService.getRedisConfig();
        const authDebug = this.buildAuthorizationSignatureDebug(redirectUrl);
        this.logger.log([
            'Shopee auth URL signature debug',
            `partner_id=${authDebug.partnerId}`,
            `auth_path=${authDebug.authPath}`,
            `timestamp=${authDebug.timestamp}`,
            `redirect=${authDebug.redirect}`,
            `partner_key_length=${authDebug.partnerKeyLength}`,
            `partner_key_sha256_prefix=${authDebug.partnerKeySha256Prefix}`,
            `sign_base_string=${authDebug.baseString}`,
            `sign=${authDebug.sign}`,
        ].join(' | '));
        return {
            url: authDebug.url,
            partnerId: authDebug.partnerId,
            partnerKeySha256Prefix: authDebug.partnerKeySha256Prefix,
            signBaseString: authDebug.baseString,
            redirectUrl,
            redisEnabled: redis.enabled,
        };
    }
    async syncAuthorizedShop(shopId) {
        const { shop, sdk, tokenRefreshed } = await this.prepareShopSync(shopId);
        const productsSynced = await this.syncInitialProducts(sdk, shop.shopId);
        const ordersSynced = await this.syncInitialOrders(sdk, shop.shopId);
        return {
            success: true,
            shopId: shop.shopId,
            tokenRefreshed,
            productsSynced,
            ordersSynced,
        };
    }
    async syncShopProducts(shopId) {
        const { shop, sdk, tokenRefreshed } = await this.prepareShopSync(shopId);
        const productsSynced = await this.syncInitialProducts(sdk, shop.shopId);
        return {
            success: true,
            scope: 'products',
            shopId: shop.shopId,
            tokenRefreshed,
            productsSynced,
        };
    }
    async syncShopOrders(shopId) {
        const { shop, sdk, tokenRefreshed } = await this.prepareShopSync(shopId);
        const ordersSynced = await this.syncInitialOrders(sdk, shop.shopId);
        return {
            success: true,
            scope: 'orders',
            shopId: shop.shopId,
            tokenRefreshed,
            ordersSynced,
        };
    }
    async syncOrderDetails(payload) {
        return this.syncOrderDetailsInternal(payload, {
            triggerType: 'manual_detail',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async syncOrderStatuses(payload) {
        return this.syncOrderStatusesInternal(payload, {
            triggerType: 'manual_status',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async syncRecentOrderDetails(payload) {
        return this.syncRecentOrderDetailsInternal(payload, {
            triggerType: 'sync_recent',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async addInvoiceData(payload) {
        return this.addInvoiceDataInternal(payload, {
            triggerType: 'invoice_add',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async createShippingDocument(payload) {
        return this.createShippingDocumentInternal(payload, {
            triggerType: 'manual_detail',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async syncShippingDocumentResult(payload) {
        return this.syncShippingDocumentResultInternal(payload, {
            triggerType: 'manual_detail',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async getShippingParameter(payload) {
        return this.getShippingParameterInternal(payload, {
            triggerType: 'shipping_parameter',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async getMassShippingParameter(payload) {
        return this.getMassShippingParameterInternal(payload, {
            triggerType: 'shipping_parameter_mass',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async shipOrder(payload) {
        return this.shipOrderInternal(payload, {
            triggerType: 'ship',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async batchShipOrder(payload) {
        return this.batchShipOrderInternal(payload, {
            triggerType: 'ship_batch',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async massShipOrder(payload) {
        return this.massShipOrderInternal(payload, {
            triggerType: 'ship_mass',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async getTrackingNumber(payload) {
        return this.getTrackingNumberInternal(payload, {
            triggerType: 'tracking_sync',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async getMassTrackingNumber(payload) {
        return this.getMassTrackingNumberInternal(payload, {
            triggerType: 'tracking_sync_mass',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async getShippingDocumentParameter(payload) {
        const targets = await this.resolvePackageTargets(payload);
        const target = this.assertSingleTarget(targets, 'shipping document parameter');
        const { sdk } = await this.prepareShopSync(target.shopId);
        if (!sdk.logistics?.getShippingDocumentParameter) {
            throw new common_1.InternalServerErrorException('Shopee logistics.getShippingDocumentParameter is not available.');
        }
        const response = await sdk.logistics.getShippingDocumentParameter({
            order_list: [
                {
                    order_sn: target.orderSn,
                    package_number: target.packageNumber,
                },
            ],
        });
        const resultRow = this.extractArray(response, [
            'response.result_list',
            'result_list',
            'data.result_list',
        ])[0] || {};
        return {
            success: true,
            data: {
                shopId: target.shopId,
                orderNo: target.orderNo,
                orderSn: target.orderSn,
                packageNumber: target.packageNumber,
                logisticsProfile: target.logisticsProfile || 'OTHER',
                shippingDocumentType: this.pickString(resultRow, [
                    'suggest_shipping_document_type',
                    'suggested_shipping_document_type',
                ]) ||
                    (await this.resolveShippingDocumentType(target)),
                selectableShippingDocumentType: this.extractArray(resultRow, [
                    'selectable_shipping_document_type',
                ]).filter((item) => typeof item === 'string'),
                channelStrategy: this.buildChannelStrategy(target),
                parameterSource: 'v2.logistics.get_shipping_document_parameter',
                raw: response,
            },
        };
    }
    async updateShippingOrder(payload) {
        return this.updateShippingOrderInternal(payload, {
            triggerType: 'shipping_update',
            requestPayloadSummary: this.buildSyncPayloadSummary(payload),
        });
    }
    async downloadShippingDocument(payload) {
        if (!payload.packageNumber) {
            throw new common_1.NotFoundException('packageNumber is required.');
        }
        const target = await this.getShippingDocumentTargets({
            packageNumber: payload.packageNumber,
            shippingDocumentType: payload.shippingDocumentType,
        });
        const packageTarget = target[0];
        if (!packageTarget) {
            throw new common_1.NotFoundException(`Package ${payload.packageNumber} not found.`);
        }
        const shippingDocumentType = payload.shippingDocumentType ||
            packageTarget.shippingDocumentType ||
            (await this.resolveShippingDocumentType(packageTarget));
        const { sdk } = await this.prepareShopSync(packageTarget.shopId);
        if (!sdk.logistics?.downloadShippingDocument) {
            throw new common_1.InternalServerErrorException('Shopee logistics.downloadShippingDocument is not available.');
        }
        const buffer = await sdk.logistics.downloadShippingDocument({
            order_list: [
                {
                    order_sn: packageTarget.orderSn,
                    package_number: packageTarget.packageNumber,
                },
            ],
            shipping_document_type: shippingDocumentType,
        });
        await this.upsertPackageMasterFromDocumentSync({
            packageContext: packageTarget,
            shippingDocumentType,
            documentStatus: packageTarget.shippingDocumentStatus || 'READY',
            downloadRef: {
                order_list: [
                    {
                        order_sn: packageTarget.orderSn,
                        package_number: packageTarget.packageNumber,
                    },
                ],
                shipping_document_type: shippingDocumentType,
            },
            message: 'Shipping document downloaded.',
        });
        return {
            buffer,
            contentType: 'application/pdf',
            fileName: `${packageTarget.packageNumber}-${shippingDocumentType}.pdf`,
        };
    }
    async getOrderSyncLogs(query) {
        const current = Math.max(1, Number(query.current) || 1);
        const pageSize = Math.max(1, Math.min(Number(query.pageSize) || 20, 100));
        const skip = (current - 1) * pageSize;
        const where = {
            ...(query.shopId ? { shopId: query.shopId } : {}),
            ...(query.triggerType ? { triggerType: query.triggerType } : {}),
            ...(query.resultStatus ? { resultStatus: query.resultStatus } : {}),
            ...(query.packageNumber ? { packageNumber: query.packageNumber } : {}),
            ...(query.orderNo || query.orderSn
                ? {
                    OR: [
                        ...(query.orderNo ? [{ orderNo: query.orderNo }] : []),
                        ...(query.orderSn ? [{ orderSn: query.orderSn }] : []),
                    ],
                }
                : {}),
            ...(query.startTime || query.endTime
                ? {
                    createdAt: {
                        ...(query.startTime ? { gte: new Date(query.startTime) } : {}),
                        ...(query.endTime ? { lte: new Date(query.endTime) } : {}),
                    },
                }
                : {}),
        };
        const [rows, total] = await this.prisma.$transaction([
            this.prisma.shopeeOrderSyncLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            this.prisma.shopeeOrderSyncLog.count({ where }),
        ]);
        return {
            success: true,
            data: rows.map((row) => ({
                logId: row.id,
                triggerType: row.triggerType,
                shopId: row.shopId,
                orderNo: row.orderNo,
                orderSn: row.orderSn,
                packageNumber: row.packageNumber,
                requestPayloadSummary: row.requestPayloadSummary,
                resultStatus: row.resultStatus,
                changedFields: Array.isArray(row.changedFields) ? row.changedFields : [],
                detailSource: row.detailSource,
                packageSource: row.packageSource,
                message: row.message,
                createdAt: row.createdAt.toISOString(),
            })),
            total,
            current,
            pageSize,
        };
    }
    async getPackageContext(packageNumber) {
        if (!packageNumber) {
            throw new common_1.NotFoundException('packageNumber is required.');
        }
        const context = await this.findOrderByPackageNumber(packageNumber);
        if (!context) {
            throw new common_1.NotFoundException(`Package ${packageNumber} not found.`);
        }
        return {
            success: true,
            data: context,
        };
    }
    async handlePushCallback(payload) {
        const validation = this.validateWebhookSignature(payload);
        if (!validation.passed) {
            await this.writeSyncLogs([
                {
                    triggerType: 'webhook',
                    resultStatus: 'failed',
                    requestPayloadSummary: {
                        query: payload.query,
                        body: this.buildWebhookBodySummary(payload.body),
                    },
                    message: `Webhook validation failed: ${validation.message}`,
                },
            ]);
            throw new common_1.UnauthorizedException(validation.message);
        }
        const dispatchContext = await this.extractWebhookDispatchContext(payload.query, payload.body);
        if (!dispatchContext.orderNos.length) {
            await this.writeSyncLogs([
                {
                    triggerType: 'webhook',
                    shopId: dispatchContext.shopId,
                    packageNumber: dispatchContext.packageNumbers[0],
                    requestPayloadSummary: dispatchContext.requestPayloadSummary,
                    resultStatus: 'partial',
                    message: `Webhook accepted but no order identifier was found for event ${dispatchContext.eventType}.`,
                },
            ]);
            return {
                success: false,
                accepted: true,
                eventType: dispatchContext.eventType,
                validation,
                message: 'Webhook payload does not include a resolvable order_sn/orderNo.',
            };
        }
        const result = await this.syncOrderStatusesInternal({
            shopId: dispatchContext.shopId,
            orderNos: dispatchContext.orderNos,
        }, {
            triggerType: 'webhook',
            requestPayloadSummary: dispatchContext.requestPayloadSummary,
        });
        let additionalWebhookLogs = 0;
        if (dispatchContext.packageNumbers.length > 0) {
            const webhookHintFields = await this.applyWebhookPackageHints({
                packageNumber: dispatchContext.packageNumbers[0],
                body: payload.body,
                fallbackContext: dispatchContext.packageContext || undefined,
            });
            if (webhookHintFields.length > 0) {
                additionalWebhookLogs += await this.writeSyncLogs([
                    {
                        triggerType: 'webhook',
                        shopId: dispatchContext.shopId,
                        orderNo: dispatchContext.orderNos[0],
                        orderSn: dispatchContext.orderNos[0],
                        packageNumber: dispatchContext.packageNumbers[0],
                        requestPayloadSummary: dispatchContext.requestPayloadSummary,
                        resultStatus: 'success',
                        changedFields: webhookHintFields,
                        detailSource: 'REALTIME_SYNCED',
                        packageSource: 'REALTIME_SYNCED',
                        message: `Applied webhook package hints: ${webhookHintFields.join(', ')}`,
                    },
                ]);
            }
        }
        return {
            success: result.success,
            accepted: true,
            eventType: dispatchContext.eventType,
            validation,
            synced: result.synced,
            failed: 'failed' in result ? result.failed : result.failedShops,
            logsWritten: result.logsWritten + additionalWebhookLogs,
        };
    }
    async syncOrderDetailsInternal(payload, context) {
        const targets = await this.resolveOrderTargets(payload);
        const directOrderNos = Array.from(new Set([payload.orderNo, ...(payload.orderNos || [])].filter((item) => Boolean(item))));
        if (targets.length === 0 && !(payload.shopId && directOrderNos.length)) {
            throw new common_1.NotFoundException('No orders found for detail sync.');
        }
        const groups = targets.length > 0
            ? this.groupTargetsByShop(targets)
            : new Map([[payload.shopId, directOrderNos]]);
        let synced = 0;
        let tokenRefreshed = false;
        let logsWritten = 0;
        const failed = [];
        for (const [shopId, orderNos] of groups.entries()) {
            try {
                const prepared = await this.prepareShopSync(shopId);
                tokenRefreshed = tokenRefreshed || prepared.tokenRefreshed;
                const summaries = await this.syncOrderDetailsForShop(prepared.sdk, shopId, orderNos, context);
                synced += summaries.length;
                logsWritten += await this.writeSyncLogs(summaries.length
                    ? summaries.map((summary) => ({
                        triggerType: context.triggerType,
                        shopId: summary.shopId,
                        orderNo: summary.orderNo,
                        orderSn: summary.orderSn,
                        packageNumber: summary.packageNumber,
                        requestPayloadSummary: context.requestPayloadSummary,
                        resultStatus: summary.resultStatus,
                        changedFields: summary.changedFields,
                        detailSource: summary.detailSource,
                        packageSource: summary.packageSource,
                        message: summary.message ||
                            `Synced order detail for ${summary.orderNo} via ${context.triggerType}.`,
                    }))
                    : orderNos.map((orderNo) => ({
                        triggerType: context.triggerType,
                        shopId,
                        orderNo,
                        orderSn: orderNo,
                        requestPayloadSummary: context.requestPayloadSummary,
                        resultStatus: 'partial',
                        message: `Shopee returned no detail rows for ${orderNo}.`,
                    })));
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown Shopee order detail sync error';
                this.logger.warn(`Order detail sync failed for shop ${shopId} and orders ${orderNos.join(', ')}: ${message}`);
                failed.push(...orderNos);
                logsWritten += await this.writeSyncLogs(orderNos.map((orderNo) => ({
                    triggerType: context.triggerType,
                    shopId,
                    orderNo,
                    orderSn: orderNo,
                    requestPayloadSummary: context.requestPayloadSummary,
                    resultStatus: 'failed',
                    message,
                })));
            }
        }
        return {
            success: failed.length === 0,
            scope: 'order_detail',
            synced,
            failed,
            tokenRefreshed,
            logsWritten,
        };
    }
    async syncOrderStatusesInternal(payload, context) {
        const hasIdentifiers = Boolean(payload.orderId ||
            payload.orderIds?.length ||
            payload.orderNo ||
            payload.orderNos?.length);
        if (hasIdentifiers) {
            const result = await this.syncOrderDetailsInternal(payload, context);
            return {
                ...result,
                scope: 'order_status',
            };
        }
        return this.syncRecentOrderDetailsInternal({
            shopId: payload.shopId,
            days: payload.days,
            limit: payload.limit,
        }, context);
    }
    async syncRecentOrderDetailsInternal(payload, context) {
        const days = Math.max(1, Number(payload.days) || 7);
        const limit = Math.max(1, Math.min(Number(payload.limit) || 50, 50));
        const shops = payload.shopId
            ? await this.prisma.channelShop.findMany({
                where: { shopId: payload.shopId },
                include: { token: true },
            })
            : await this.prisma.channelShop.findMany({
                where: { status: client_1.ShopStatus.AUTHORIZED },
                include: { token: true },
            });
        const enabledShops = shops.filter((shop) => shop.token);
        if (enabledShops.length === 0) {
            throw new common_1.NotFoundException('No authorized Shopee shops found for recent sync.');
        }
        let synced = 0;
        let scanned = 0;
        let tokenRefreshed = false;
        let logsWritten = 0;
        const failedShops = [];
        for (const shop of enabledShops) {
            try {
                const prepared = await this.prepareShopSync(shop.shopId);
                tokenRefreshed = tokenRefreshed || prepared.tokenRefreshed;
                const listRows = await this.loadOrdersByTimeWindow(prepared.sdk, days, limit);
                scanned += listRows.length;
                const summaries = await this.syncOrderListRows(prepared.sdk, shop.shopId, listRows, context);
                synced += summaries.length;
                logsWritten += await this.writeSyncLogs(summaries.length
                    ? summaries.map((summary) => ({
                        triggerType: context.triggerType,
                        shopId: summary.shopId,
                        orderNo: summary.orderNo,
                        orderSn: summary.orderSn,
                        packageNumber: summary.packageNumber,
                        requestPayloadSummary: {
                            ...context.requestPayloadSummary,
                            days,
                            limit,
                        },
                        resultStatus: summary.resultStatus,
                        changedFields: summary.changedFields,
                        detailSource: summary.detailSource,
                        packageSource: summary.packageSource,
                        message: summary.message ||
                            `Synced recent order detail for ${summary.orderNo} via ${context.triggerType}.`,
                    }))
                    : [
                        {
                            triggerType: context.triggerType,
                            shopId: shop.shopId,
                            requestPayloadSummary: {
                                ...context.requestPayloadSummary,
                                days,
                                limit,
                                scanned: listRows.length,
                            },
                            resultStatus: listRows.length > 0 ? 'partial' : 'success',
                            message: listRows.length > 0
                                ? `Recent sync scanned ${listRows.length} orders but no detail rows were upserted.`
                                : `Recent sync finished with no orders in the selected time window.`,
                        },
                    ]);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown recent detail sync error';
                this.logger.warn(`Recent detail sync failed for shop ${shop.shopId}: ${message}`);
                failedShops.push(shop.shopId);
                logsWritten += await this.writeSyncLogs([
                    {
                        triggerType: context.triggerType,
                        shopId: shop.shopId,
                        requestPayloadSummary: {
                            ...context.requestPayloadSummary,
                            days,
                            limit,
                        },
                        resultStatus: 'failed',
                        message,
                    },
                ]);
            }
        }
        return {
            success: failedShops.length === 0,
            scope: 'recent_order_detail',
            days,
            limit,
            shops: enabledShops.length,
            scanned,
            synced,
            failedShops,
            tokenRefreshed,
            logsWritten,
        };
    }
    async addInvoiceDataInternal(payload, context) {
        const target = await this.resolveInvoiceMutationTarget(payload);
        const invoiceData = this.buildInvoiceDataPayload(payload.invoiceData || {});
        try {
            const { sdk } = await this.prepareShopSync(target.shopId);
            if (!sdk.order?.addInvoiceData) {
                throw new common_1.InternalServerErrorException('Shopee order.addInvoiceData is not available.');
            }
            const response = await sdk.order.addInvoiceData({
                order_sn: target.orderSn,
                invoice_data: invoiceData,
            });
            await this.patchOrderInvoiceData({
                target,
                invoiceData,
                message: 'Invoice data submitted to Shopee.',
            });
            const refreshed = await this.refreshOrderDetailWithoutLog(target.shopId, target.orderNo, {
                triggerType: context.triggerType,
                requestPayloadSummary: {
                    ...context.requestPayloadSummary,
                    source: 'invoice_add_refresh',
                },
            });
            await this.writeSyncLogs([
                {
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        invoice_data: invoiceData,
                        response,
                    },
                    resultStatus: refreshed ? 'success' : 'partial',
                    changedFields: ['invoice_data', ...(refreshed ? refreshed.changedFields : [])],
                    detailSource: refreshed?.detailSource || 'REALTIME_SYNCED',
                    packageSource: refreshed?.packageSource || 'REALTIME_SYNCED',
                    message: refreshed
                        ? `Invoice data submitted and order detail refreshed for ${target.orderNo}.`
                        : `Invoice data submitted for ${target.orderNo}, but refresh returned no detail rows.`,
                },
            ]);
            return {
                success: true,
                data: {
                    scope: 'invoice_add',
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    refreshed: Boolean(refreshed),
                    orderStatus: refreshed?.orderStatus || target.orderStatus,
                    response,
                },
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown Shopee add invoice error';
            await this.writeSyncLogs([
                {
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        invoice_data: invoiceData,
                    },
                    resultStatus: 'failed',
                    changedFields: ['invoice_data'],
                    message,
                },
            ]);
            return {
                success: false,
                errorMessage: message,
                data: {
                    scope: 'invoice_add',
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                },
            };
        }
    }
    async resolveInvoiceMutationTarget(payload) {
        const packageNumber = payload.packageNumber?.trim();
        if (packageNumber) {
            const packageContext = await this.findOrderByPackageNumber(packageNumber);
            if (!packageContext) {
                throw new common_1.NotFoundException(`Package ${packageNumber} not found.`);
            }
            return {
                shopId: packageContext.shopId,
                orderId: packageContext.orderId || undefined,
                orderNo: packageContext.orderNo,
                orderSn: packageContext.orderSn,
                orderStatus: this.normalizeShopeeOrderStatus(packageContext.orderStatus),
                packageNumber,
            };
        }
        const ids = Array.from(new Set([payload.orderId, ...(payload.orderIds || [])].filter((item) => Boolean(item))));
        const orderRefs = Array.from(new Set([
            payload.orderNo,
            payload.orderSn,
            ...(payload.orderNos || []),
        ].filter((item) => Boolean(item))));
        if (ids.length === 0 && orderRefs.length === 0) {
            throw new common_1.NotFoundException('orderNo, orderSn or packageNumber is required.');
        }
        const row = await this.prisma.erpOrder.findFirst({
            where: {
                ...(payload.shopId ? { shopId: payload.shopId } : {}),
                OR: [
                    ...(ids.length ? [{ id: { in: ids } }] : []),
                    ...(orderRefs.length ? [{ orderNo: { in: orderRefs } }] : []),
                ],
            },
            select: {
                id: true,
                shopId: true,
                orderNo: true,
                orderStatus: true,
                rawJson: true,
            },
        });
        if (!row) {
            throw new common_1.NotFoundException('No order found for invoice submission.');
        }
        const raw = row.rawJson && typeof row.rawJson === 'object' && !Array.isArray(row.rawJson)
            ? row.rawJson
            : {};
        const packageList = this.extractArray(raw, ['package_list']);
        return {
            shopId: row.shopId,
            orderId: row.id,
            orderNo: row.orderNo,
            orderSn: this.pickString(raw, ['order_sn', 'orderSn']) || row.orderNo,
            orderStatus: this.normalizeShopeeOrderStatus(row.orderStatus),
            packageNumber: this.pickString(packageList[0], [
                'package_number',
                'packageNumber',
            ]),
        };
    }
    buildInvoiceDataPayload(input) {
        const issueDate = this.parseInvoiceIssueDate(this.readNested(input, 'issue_date') ||
            this.readNested(input, 'issueDate'));
        const totalValue = this.pickDecimalNumber(input, ['total_value', 'totalValue']);
        const productsTotalValue = this.pickDecimalNumber(input, [
            'products_total_value',
            'productsTotalValue',
        ]);
        return {
            number: this.pickString(input, ['number']) || '',
            series_number: this.pickString(input, ['series_number', 'seriesNumber']) || '',
            access_key: this.pickString(input, ['access_key', 'accessKey']) || '',
            issue_date: issueDate,
            total_value: totalValue,
            products_total_value: productsTotalValue ?? totalValue,
            tax_code: this.pickString(input, ['tax_code', 'taxCode']) || '',
        };
    }
    parseInvoiceIssueDate(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value > 9999999999 ? Math.floor(value / 1000) : value;
        }
        if (typeof value === 'string' && value.trim()) {
            const trimmed = value.trim();
            const numeric = Number(trimmed);
            if (Number.isFinite(numeric) && trimmed === String(numeric)) {
                return numeric > 9999999999 ? Math.floor(numeric / 1000) : numeric;
            }
            const timestamp = Date.parse(trimmed);
            if (!Number.isNaN(timestamp)) {
                return Math.floor(timestamp / 1000);
            }
        }
        return Math.floor(Date.now() / 1000);
    }
    pickDecimalNumber(source, keys) {
        for (const key of keys) {
            const value = this.readNested(source, key);
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            if (typeof value === 'string' && value.trim()) {
                const parsed = Number(value.replace(',', '.'));
                if (Number.isFinite(parsed)) {
                    return parsed;
                }
            }
        }
        return undefined;
    }
    async patchOrderInvoiceData(input) {
        const existing = await this.prisma.erpOrder.findUnique({
            where: { orderNo: input.target.orderNo },
            select: { rawJson: true },
        });
        const previousRaw = existing?.rawJson &&
            typeof existing.rawJson === 'object' &&
            !Array.isArray(existing.rawJson)
            ? existing.rawJson
            : {};
        const nextRaw = this.decorateSyncMeta({
            ...previousRaw,
            order_sn: this.pickString(previousRaw, ['order_sn', 'orderSn']) || input.target.orderSn,
            order_status: this.normalizeShopeeOrderStatus(this.pickString(previousRaw, ['order_status', 'orderStatus']) ||
                input.target.orderStatus) || input.target.orderStatus,
            invoice_data: input.invoiceData,
        }, {
            triggerType: 'invoice_add',
            resultStatus: 'success',
            message: input.message,
        });
        await this.prisma.erpOrder.update({
            where: { orderNo: input.target.orderNo },
            data: {
                rawJson: nextRaw,
                orderStatus: this.normalizeShopeeOrderStatus(this.pickString(nextRaw, ['order_status', 'orderStatus']) ||
                    input.target.orderStatus) || 'PENDING_INVOICE',
            },
        });
    }
    async refreshOrderDetailWithoutLog(shopId, orderNo, context) {
        const prepared = await this.prepareShopSync(shopId);
        const summaries = await this.syncOrderDetailsForShop(prepared.sdk, shopId, [orderNo], context);
        return summaries[0];
    }
    async getShippingParameterInternal(payload, context) {
        const targets = await this.resolvePackageTargets(payload);
        const target = this.assertSingleTarget(targets, 'shipping parameter');
        const invoiceGate = this.buildInvoiceGateState(target);
        const strategy = this.buildChannelStrategy(target);
        if (invoiceGate.length > 0) {
            await this.writeSyncLogs([
                {
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        logisticsProfile: strategy.profile,
                        logisticsChannelId: target.logisticsChannelId,
                        channelStrategyProfile: strategy.profile,
                    },
                    resultStatus: 'partial',
                    changedFields: [],
                    detailSource: 'REALTIME_SYNCED',
                    packageSource: 'REALTIME_SYNCED',
                    message: invoiceGate.join('；'),
                },
            ]);
            this.scheduleTrackingRetry(target, {
                sourceTrigger: context.triggerType,
            });
            return {
                success: true,
                data: {
                    ...this.buildParameterFallbackSnapshot(target, strategy, {
                        source: 'get_shipping_parameter',
                        parameterSource: 'local_invoice_gate',
                        missingPreconditions: invoiceGate,
                    }),
                    raw: null,
                },
            };
        }
        const { sdk } = await this.prepareShopSync(target.shopId);
        if (!sdk.logistics?.getShippingParameter) {
            throw new common_1.InternalServerErrorException('Shopee logistics.getShippingParameter is not available.');
        }
        try {
            const response = await sdk.logistics.getShippingParameter({
                order_sn: target.orderSn,
                package_number: target.packageNumber,
            });
            const snapshot = this.normalizeShippingParameterResponse({
                source: 'get_shipping_parameter',
                response: response,
                target,
            });
            await this.writeSyncLogs([
                {
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        logisticsProfile: strategy.profile,
                        logisticsChannelId: target.logisticsChannelId,
                        channelStrategyProfile: strategy.profile,
                    },
                    resultStatus: snapshot.canShip ? 'success' : 'partial',
                    changedFields: ['shipping_parameter'],
                    detailSource: 'REALTIME_SYNCED',
                    packageSource: 'REALTIME_SYNCED',
                    message: snapshot.canShip
                        ? `Shipping parameter loaded for ${target.packageNumber}.`
                        : `Shipping parameter loaded but not shippable: ${snapshot.missingPreconditions.join('；')}`,
                },
            ]);
            return {
                success: true,
                data: {
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    logisticsProfile: snapshot.logisticsProfile,
                    logisticsChannelId: snapshot.logisticsChannelId,
                    logisticsChannelName: snapshot.logisticsChannelName,
                    serviceCode: snapshot.serviceCode,
                    shippingMode: snapshot.shippingMode,
                    infoNeeded: snapshot.infoNeeded,
                    canShip: snapshot.canShip,
                    missingPreconditions: snapshot.missingPreconditions,
                    pickup: snapshot.pickup,
                    dropoff: snapshot.dropoff,
                    nonIntegrated: snapshot.nonIntegrated,
                    parameterSource: snapshot.parameterSource,
                    checkedAt: snapshot.checkedAt,
                    channelStrategy: snapshot.channelStrategy,
                    raw: response,
                },
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown shipping parameter error';
            await this.writeSyncLogs([
                {
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        logisticsProfile: strategy.profile,
                        logisticsChannelId: target.logisticsChannelId,
                        channelStrategyProfile: strategy.profile,
                    },
                    resultStatus: 'failed',
                    message,
                },
            ]);
            throw error;
        }
    }
    async getMassShippingParameterInternal(payload, context) {
        const targets = await this.resolvePackageTargets(payload);
        if (targets.length === 0) {
            throw new common_1.NotFoundException('No packages found for mass shipping parameter lookup.');
        }
        const grouped = this.groupTargetsForMassAction(targets, payload);
        const groups = [];
        for (const group of grouped) {
            const invoiceBlocked = group.targets.flatMap((target) => this.buildInvoiceGateState(target));
            const strategy = this.buildChannelStrategy(group.targets[0]);
            if (invoiceBlocked.length > 0) {
                groups.push({
                    groupKey: group.groupKey,
                    shopId: group.shopId,
                    logisticsProfile: strategy.profile,
                    logisticsChannelId: group.logisticsChannelId,
                    productLocationId: group.productLocationId,
                    successList: [],
                    failList: group.targets.map((target) => ({
                        packageNumber: target.packageNumber,
                        failReason: invoiceBlocked.join('；'),
                    })),
                    infoNeeded: {
                        pickup: [],
                        dropoff: [],
                        nonIntegrated: [],
                    },
                    canShip: false,
                    missingPreconditions: invoiceBlocked,
                    parameterSource: 'local_invoice_gate',
                    channelStrategy: strategy,
                    checkedAt: new Date().toISOString(),
                });
                continue;
            }
            try {
                const { sdk } = await this.prepareShopSync(group.shopId);
                if (!sdk.logistics?.getMassShippingParameter) {
                    throw new common_1.InternalServerErrorException('Shopee logistics.getMassShippingParameter is not available.');
                }
                const response = await sdk.logistics.getMassShippingParameter({
                    package_list: group.targets.map((target) => ({
                        package_number: target.packageNumber,
                    })),
                    ...(group.logisticsChannelId
                        ? { logistics_channel_id: group.logisticsChannelId }
                        : {}),
                    ...(group.productLocationId
                        ? { product_location_id: group.productLocationId }
                        : {}),
                });
                const normalized = this.normalizeMassShippingParameterResponse({
                    response: response,
                    group,
                });
                groups.push({
                    groupKey: group.groupKey,
                    shopId: group.shopId,
                    logisticsProfile: normalized.logisticsProfile,
                    logisticsChannelId: normalized.logisticsChannelId,
                    productLocationId: normalized.productLocationId,
                    successList: normalized.successList,
                    failList: normalized.failList,
                    infoNeeded: normalized.infoNeeded,
                    pickup: normalized.pickup,
                    dropoff: normalized.dropoff,
                    nonIntegrated: normalized.nonIntegrated,
                    canShip: normalized.canShip,
                    missingPreconditions: normalized.missingPreconditions,
                    parameterSource: normalized.parameterSource,
                    channelStrategy: normalized.channelStrategy,
                    checkedAt: normalized.checkedAt,
                    raw: response,
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown mass shipping parameter error';
                groups.push({
                    groupKey: group.groupKey,
                    shopId: group.shopId,
                    logisticsProfile: strategy.profile,
                    logisticsChannelId: group.logisticsChannelId,
                    productLocationId: group.productLocationId,
                    successList: [],
                    failList: group.targets.map((target) => ({
                        packageNumber: target.packageNumber,
                        failReason: message,
                    })),
                    infoNeeded: {
                        pickup: [],
                        dropoff: [],
                        nonIntegrated: [],
                    },
                    canShip: false,
                    missingPreconditions: [message],
                    parameterSource: 'get_mass_shipping_parameter_error',
                    channelStrategy: strategy,
                    checkedAt: new Date().toISOString(),
                    raw: null,
                });
            }
        }
        const logs = [];
        for (const group of groups) {
            const failList = this.extractArray(group, ['failList']);
            const successList = this.extractArray(group, ['successList']);
            for (const item of successList) {
                logs.push({
                    triggerType: context.triggerType,
                    shopId: String(this.readNested(group, 'shopId') || payload.shopId || ''),
                    packageNumber: this.pickString(item, ['packageNumber']) || undefined,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        groupKey: this.pickString(group, ['groupKey']) || undefined,
                        logisticsProfile: this.pickString(group, ['logisticsProfile']) || undefined,
                        logisticsChannelId: this.readNested(group, 'logisticsChannelId') || undefined,
                        productLocationId: this.pickString(group, ['productLocationId']) || undefined,
                    },
                    resultStatus: 'success',
                    changedFields: ['shipping_parameter'],
                    detailSource: 'REALTIME_SYNCED',
                    packageSource: 'REALTIME_SYNCED',
                    message: `Mass shipping parameter ready for ${this.pickString(item, ['packageNumber']) || '-'}.`,
                });
            }
            for (const item of failList) {
                logs.push({
                    triggerType: context.triggerType,
                    shopId: String(this.readNested(group, 'shopId') || payload.shopId || ''),
                    packageNumber: this.pickString(item, ['packageNumber']) || undefined,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        groupKey: this.pickString(group, ['groupKey']) || undefined,
                        logisticsProfile: this.pickString(group, ['logisticsProfile']) || undefined,
                        logisticsChannelId: this.readNested(group, 'logisticsChannelId') || undefined,
                        productLocationId: this.pickString(group, ['productLocationId']) || undefined,
                    },
                    resultStatus: 'partial',
                    message: this.pickString(item, ['failReason']) || 'Mass shipping parameter failed.',
                });
            }
        }
        await this.writeSyncLogs(logs);
        return {
            success: true,
            data: {
                scope: 'shipping_parameter_mass',
                groups,
            },
        };
    }
    async shipOrderInternal(payload, context) {
        const targets = await this.resolvePackageTargets(payload);
        const target = this.assertSingleTarget(targets, 'ship order');
        try {
            const precheck = await this.getSingleShippingParameterSnapshot(target);
            this.assertShippableTargets([target], [precheck]);
            const { sdk } = await this.prepareShopSync(target.shopId);
            if (!sdk.logistics?.shipOrder) {
                throw new common_1.InternalServerErrorException('Shopee logistics.shipOrder is not available.');
            }
            const response = await sdk.logistics.shipOrder(this.buildSingleShipPayload(target, precheck, payload));
            const refreshed = await this.refreshOrderDetailWithoutLog(target.shopId, target.orderNo, {
                triggerType: context.triggerType,
                requestPayloadSummary: {
                    ...context.requestPayloadSummary,
                    source: 'ship_refresh',
                },
            });
            await this.writeSyncLogs([
                {
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        shippingMode: precheck.shippingMode,
                        logisticsProfile: precheck.logisticsProfile,
                    },
                    resultStatus: refreshed ? 'success' : 'partial',
                    changedFields: refreshed?.changedFields || ['order_status', 'package_list'],
                    detailSource: refreshed?.detailSource || 'REALTIME_SYNCED',
                    packageSource: refreshed?.packageSource || 'REALTIME_SYNCED',
                    message: refreshed
                        ? `ship_order succeeded for ${target.packageNumber} and detail refreshed.`
                        : `ship_order succeeded for ${target.packageNumber}, but refresh returned no detail row.`,
                },
            ]);
            return {
                success: true,
                data: {
                    scope: 'ship_single',
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    shippingMode: precheck.shippingMode,
                    logisticsProfile: precheck.logisticsProfile,
                    channelStrategy: precheck.channelStrategy,
                    refreshed: Boolean(refreshed),
                    response,
                },
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown ship_order error';
            await this.writeSyncLogs([
                {
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        logisticsProfile: target.logisticsProfile || 'OTHER',
                        logisticsChannelId: target.logisticsChannelId,
                    },
                    resultStatus: 'failed',
                    message,
                },
            ]);
            throw error;
        }
    }
    async batchShipOrderInternal(payload, context) {
        const targets = await this.resolvePackageTargets(payload);
        if (targets.length === 0) {
            throw new common_1.NotFoundException('No packages found for batch ship.');
        }
        const groups = this.groupTargetsByShopAndMode(targets);
        const summaries = [];
        for (const group of groups) {
            try {
                if (group.targets.some((target) => (target.logisticsChannelId || 0) !== 90003)) {
                    throw new common_1.BadRequestException('batch_ship_order 仅适用于文档限定的 Brazil channel 90003（Padrão）分组。');
                }
                const prechecks = await this.getShippingParameterSnapshots(group.targets);
                this.assertShippableTargets(group.targets, prechecks);
                const mode = this.assertSingleShippingMode(prechecks, 'batch_ship_order');
                const { sdk } = await this.prepareShopSync(group.shopId);
                if (!sdk.logistics?.batchShipOrder) {
                    throw new common_1.InternalServerErrorException('Shopee logistics.batchShipOrder is not available.');
                }
                const response = await sdk.logistics.batchShipOrder({
                    order_list: group.targets.map((target) => ({
                        order_sn: target.orderSn,
                        package_number: target.packageNumber,
                    })),
                    ...this.buildSharedShipModePayload(mode, prechecks[0], payload, group.targets),
                });
                const resultList = this.extractArray(response, [
                    'response.result_list',
                    'result_list',
                    'data.result_list',
                ]);
                const resultByKey = new Map(resultList.map((item) => [
                    `${this.pickString(item, ['order_sn']) || ''}:${this.pickString(item, ['package_number']) || ''}`,
                    item,
                ]));
                const successfulTargets = group.targets.filter((target) => {
                    const row = resultByKey.get(`${target.orderSn}:${target.packageNumber}`);
                    return !this.pickString(row || {}, ['fail_error', 'failError']);
                });
                const refreshSummaries = await this.refreshUniqueOrdersWithoutLog(successfulTargets, context.triggerType, context.requestPayloadSummary);
                const logs = group.targets.map((target) => {
                    const row = resultByKey.get(`${target.orderSn}:${target.packageNumber}`) || {};
                    const failMessage = this.pickString(row, ['fail_message', 'failMessage']) ||
                        this.pickString(row, ['fail_error', 'failError']);
                    const refreshed = refreshSummaries.get(target.orderNo);
                    return {
                        triggerType: context.triggerType,
                        shopId: target.shopId,
                        orderNo: target.orderNo,
                        orderSn: target.orderSn,
                        packageNumber: target.packageNumber,
                        requestPayloadSummary: {
                            ...context.requestPayloadSummary,
                            shippingMode: mode,
                        },
                        resultStatus: failMessage ? 'failed' : refreshed ? 'success' : 'partial',
                        changedFields: failMessage ? [] : refreshed?.changedFields || ['order_status', 'package_list'],
                        detailSource: refreshed?.detailSource,
                        packageSource: refreshed?.packageSource,
                        message: failMessage ||
                            (refreshed
                                ? `batch_ship_order succeeded for ${target.packageNumber}.`
                                : `batch_ship_order succeeded for ${target.packageNumber}, waiting refresh.`),
                    };
                });
                await this.writeSyncLogs(logs);
                for (const target of successfulTargets) {
                    this.scheduleTrackingRetry(target, {
                        sourceTrigger: context.triggerType,
                    });
                }
                summaries.push({
                    scope: 'ship_batch',
                    shopId: group.shopId,
                    shippingMode: mode,
                    requested: group.targets.length,
                    succeeded: successfulTargets.length,
                    failed: logs
                        .filter((item) => item.resultStatus === 'failed')
                        .map((item) => item.packageNumber),
                    response,
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown batch_ship_order error';
                await this.writeSyncLogs(group.targets.map((target) => ({
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        logisticsProfile: target.logisticsProfile || 'OTHER',
                        logisticsChannelId: target.logisticsChannelId,
                    },
                    resultStatus: 'failed',
                    message,
                })));
                throw error;
            }
        }
        return {
            success: true,
            data: {
                scope: 'ship_batch',
                groups: summaries,
            },
        };
    }
    async massShipOrderInternal(payload, context) {
        const targets = await this.resolvePackageTargets(payload);
        if (targets.length === 0) {
            throw new common_1.NotFoundException('No packages found for mass ship.');
        }
        const groups = this.groupTargetsForMassAction(targets, {});
        const summaries = [];
        for (const group of groups) {
            try {
                const precheck = await this.getMassShippingParameterSnapshot(group);
                if (!precheck.canShip) {
                    throw new common_1.BadRequestException(precheck.missingPreconditions.join('；'));
                }
                const mode = precheck.shippingMode;
                if (mode === 'unknown') {
                    throw new common_1.BadRequestException('Unable to determine shipping mode for mass_ship_order.');
                }
                const { sdk } = await this.prepareShopSync(group.shopId);
                if (!sdk.logistics?.massShipOrder) {
                    throw new common_1.InternalServerErrorException('Shopee logistics.massShipOrder is not available.');
                }
                const response = await sdk.logistics.massShipOrder({
                    package_list: group.targets.map((target) => ({
                        package_number: target.packageNumber,
                    })),
                    ...(group.logisticsChannelId
                        ? { logistics_channel_id: group.logisticsChannelId }
                        : {}),
                    ...(group.productLocationId
                        ? { product_location_id: group.productLocationId }
                        : {}),
                    ...this.buildMassShipModePayload(mode, precheck, payload, group.targets),
                });
                const successList = this.extractArray(response, [
                    'response.success_list',
                    'success_list',
                    'data.success_list',
                ]);
                const failList = this.extractArray(response, [
                    'response.fail_list',
                    'fail_list',
                    'data.fail_list',
                ]);
                const successfulPackageNumbers = new Set(successList
                    .map((item) => this.pickString(item, ['package_number', 'packageNumber']))
                    .filter((item) => Boolean(item)));
                const failedByPackage = new Map(failList.map((item) => [
                    this.pickString(item, ['package_number', 'packageNumber']) || (0, node_crypto_1.randomUUID)(),
                    this.pickString(item, ['fail_reason', 'failReason']) || 'mass_ship_order failed',
                ]));
                const successfulTargets = group.targets.filter((target) => successfulPackageNumbers.has(target.packageNumber));
                const refreshSummaries = await this.refreshUniqueOrdersWithoutLog(successfulTargets, context.triggerType, context.requestPayloadSummary);
                const logs = group.targets.map((target) => {
                    const failMessage = failedByPackage.get(target.packageNumber);
                    const refreshed = refreshSummaries.get(target.orderNo);
                    return {
                        triggerType: context.triggerType,
                        shopId: target.shopId,
                        orderNo: target.orderNo,
                        orderSn: target.orderSn,
                        packageNumber: target.packageNumber,
                        requestPayloadSummary: {
                            ...context.requestPayloadSummary,
                            shippingMode: mode,
                            groupKey: group.groupKey,
                        },
                        resultStatus: failMessage ? 'failed' : refreshed ? 'success' : 'partial',
                        changedFields: failMessage ? [] : refreshed?.changedFields || ['order_status', 'package_list'],
                        detailSource: refreshed?.detailSource,
                        packageSource: refreshed?.packageSource,
                        message: failMessage ||
                            (refreshed
                                ? `mass_ship_order succeeded for ${target.packageNumber}.`
                                : `mass_ship_order succeeded for ${target.packageNumber}, waiting refresh.`),
                    };
                });
                await this.writeSyncLogs(logs);
                for (const target of successfulTargets) {
                    this.scheduleTrackingRetry(target, {
                        sourceTrigger: context.triggerType,
                    });
                }
                summaries.push({
                    scope: 'ship_mass',
                    shopId: group.shopId,
                    logisticsChannelId: group.logisticsChannelId,
                    productLocationId: group.productLocationId,
                    shippingMode: mode,
                    requested: group.targets.length,
                    succeeded: successList.length,
                    failed: failList.map((item) => ({
                        packageNumber: this.pickString(item, ['package_number', 'packageNumber']),
                        failReason: this.pickString(item, ['fail_reason', 'failReason']),
                    })),
                    response,
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown mass_ship_order error';
                await this.writeSyncLogs(group.targets.map((target) => ({
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        logisticsProfile: target.logisticsProfile || 'OTHER',
                        logisticsChannelId: target.logisticsChannelId,
                        productLocationId: group.productLocationId,
                    },
                    resultStatus: 'failed',
                    message,
                })));
                throw error;
            }
        }
        return {
            success: true,
            data: {
                scope: 'ship_mass',
                groups: summaries,
            },
        };
    }
    async getTrackingNumberInternal(payload, context) {
        const targets = await this.resolvePackageTargets(payload);
        const target = this.assertSingleTarget(targets, 'tracking sync');
        const { sdk } = await this.prepareShopSync(target.shopId);
        if (!sdk.logistics?.getTrackingNumber) {
            throw new common_1.InternalServerErrorException('Shopee logistics.getTrackingNumber is not available.');
        }
        const response = await sdk.logistics.getTrackingNumber({
            order_sn: target.orderSn,
            package_number: target.packageNumber,
            ...(payload.responseOptionalFields
                ? { response_optional_fields: payload.responseOptionalFields }
                : {}),
        });
        const trackingPayload = this.readNested(response, 'response') ||
            response;
        await this.patchPackageTrackingData(target, trackingPayload);
        const trackingNumber = this.pickString(trackingPayload, ['tracking_number']);
        const message = trackingNumber
            ? `Tracking number synced for ${target.packageNumber}.`
            : `Tracking number is still empty for ${target.packageNumber}; keep polling in 5-minute intervals.`;
        await this.writeSyncLogs([
            {
                triggerType: context.triggerType,
                shopId: target.shopId,
                orderNo: target.orderNo,
                orderSn: target.orderSn,
                packageNumber: target.packageNumber,
                requestPayloadSummary: {
                    ...context.requestPayloadSummary,
                    logisticsProfile: target.logisticsProfile || 'OTHER',
                    logisticsChannelId: target.logisticsChannelId,
                },
                resultStatus: trackingNumber ? 'success' : 'partial',
                changedFields: trackingNumber ? ['tracking_number'] : [],
                detailSource: 'REALTIME_SYNCED',
                packageSource: 'REALTIME_SYNCED',
                message,
            },
        ]);
        return {
            success: true,
            data: {
                scope: 'tracking_sync_single',
                shopId: target.shopId,
                orderNo: target.orderNo,
                orderSn: target.orderSn,
                packageNumber: target.packageNumber,
                trackingNumber: trackingNumber || '',
                plpNumber: this.pickString(trackingPayload, ['plp_number']) || '',
                firstMileTrackingNumber: this.pickString(trackingPayload, ['first_mile_tracking_number']) || '',
                lastMileTrackingNumber: this.pickString(trackingPayload, ['last_mile_tracking_number']) || '',
                hint: this.pickString(trackingPayload, ['hint']) || '',
                pickupCode: this.pickString(trackingPayload, ['pickup_code']) || '',
                response,
            },
        };
    }
    async getMassTrackingNumberInternal(payload, context) {
        const targets = await this.resolvePackageTargets(payload);
        if (targets.length === 0) {
            throw new common_1.NotFoundException('No packages found for mass tracking sync.');
        }
        const groups = this.groupTargetsForMassAction(targets, {});
        const summaries = [];
        for (const group of groups) {
            const { sdk } = await this.prepareShopSync(group.shopId);
            if (!sdk.logistics?.getMassTrackingNumber) {
                throw new common_1.InternalServerErrorException('Shopee logistics.getMassTrackingNumber is not available.');
            }
            const response = await sdk.logistics.getMassTrackingNumber({
                package_list: group.targets.map((target) => ({
                    package_number: target.packageNumber,
                })),
                ...(payload.responseOptionalFields
                    ? { response_optional_fields: payload.responseOptionalFields }
                    : {}),
            });
            const successList = this.extractArray(response, [
                'response.success_list',
                'success_list',
                'data.success_list',
            ]);
            const failList = this.extractArray(response, [
                'response.fail_list',
                'fail_list',
                'data.fail_list',
            ]);
            const byPackage = new Map(successList.map((item) => [
                this.pickString(item, ['package_number', 'packageNumber']) || (0, node_crypto_1.randomUUID)(),
                item,
            ]));
            for (const target of group.targets) {
                const hit = byPackage.get(target.packageNumber);
                if (hit) {
                    await this.patchPackageTrackingData(target, hit);
                }
            }
            const logs = group.targets.map((target) => {
                const hit = byPackage.get(target.packageNumber);
                const failed = failList.find((item) => this.pickString(item, ['package_number', 'packageNumber']) ===
                    target.packageNumber);
                const trackingNumber = this.pickString(hit || {}, ['tracking_number']);
                return {
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        groupKey: group.groupKey,
                        logisticsProfile: target.logisticsProfile || 'OTHER',
                        logisticsChannelId: target.logisticsChannelId,
                        productLocationId: group.productLocationId,
                    },
                    resultStatus: failed ? 'failed' : trackingNumber ? 'success' : 'partial',
                    changedFields: trackingNumber ? ['tracking_number'] : [],
                    detailSource: 'REALTIME_SYNCED',
                    packageSource: 'REALTIME_SYNCED',
                    message: this.pickString(failed || {}, ['fail_reason', 'failReason']) ||
                        (trackingNumber
                            ? `Mass tracking synced for ${target.packageNumber}.`
                            : `Tracking number is still empty for ${target.packageNumber}.`),
                };
            });
            await this.writeSyncLogs(logs);
            summaries.push({
                scope: 'tracking_sync_mass',
                shopId: group.shopId,
                logisticsChannelId: group.logisticsChannelId,
                productLocationId: group.productLocationId,
                successList: successList.map((item) => ({
                    packageNumber: this.pickString(item, ['package_number', 'packageNumber']),
                    trackingNumber: this.pickString(item, ['tracking_number']),
                    plpNumber: this.pickString(item, ['plp_number']),
                    firstMileTrackingNumber: this.pickString(item, ['first_mile_tracking_number']),
                    lastMileTrackingNumber: this.pickString(item, ['last_mile_tracking_number']),
                    hint: this.pickString(item, ['hint']),
                    pickupCode: this.pickString(item, ['pickup_code']),
                })),
                failList: failList.map((item) => ({
                    packageNumber: this.pickString(item, [
                        'package_number',
                        'packageNumber',
                    ]),
                    failReason: this.pickString(item, ['fail_reason', 'failReason']),
                })),
                response,
            });
        }
        return {
            success: true,
            data: {
                scope: 'tracking_sync_mass',
                groups: summaries,
            },
        };
    }
    async updateShippingOrderInternal(payload, context) {
        const targets = await this.resolvePackageTargets(payload);
        const target = this.assertSingleTarget(targets, 'update shipping order');
        try {
            const precheck = await this.getSingleShippingParameterSnapshot(target);
            if (precheck.shippingMode !== 'pickup') {
                throw new common_1.BadRequestException('update_shipping_order 当前仅接入 pickup 改约场景，请先确认该包裹返回 pickup 参数。');
            }
            const { sdk } = await this.prepareShopSync(target.shopId);
            if (!sdk.logistics?.updateShippingOrder) {
                throw new common_1.InternalServerErrorException('Shopee logistics.updateShippingOrder is not available.');
            }
            const pickup = this.buildUpdatePickupPayload(precheck, payload);
            const response = await sdk.logistics.updateShippingOrder({
                order_sn: target.orderSn,
                package_number: target.packageNumber,
                pickup,
            });
            const refreshed = await this.refreshOrderDetailWithoutLog(target.shopId, target.orderNo, {
                triggerType: context.triggerType,
                requestPayloadSummary: {
                    ...context.requestPayloadSummary,
                    source: 'shipping_update_refresh',
                },
            });
            await this.writeSyncLogs([
                {
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        pickup,
                    },
                    resultStatus: refreshed ? 'success' : 'partial',
                    changedFields: refreshed?.changedFields || ['package_list'],
                    detailSource: refreshed?.detailSource,
                    packageSource: refreshed?.packageSource,
                    message: refreshed
                        ? `update_shipping_order succeeded for ${target.packageNumber}.`
                        : `update_shipping_order succeeded for ${target.packageNumber}, waiting refresh.`,
                },
            ]);
            return {
                success: true,
                data: {
                    scope: 'shipping_update',
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    pickup,
                    response,
                    refreshed: Boolean(refreshed),
                },
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown update_shipping_order error';
            await this.writeSyncLogs([
                {
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        logisticsProfile: target.logisticsProfile || 'OTHER',
                        logisticsChannelId: target.logisticsChannelId,
                    },
                    resultStatus: 'failed',
                    message,
                },
            ]);
            throw error;
        }
    }
    async resolvePackageTargets(payload) {
        const packageNumbers = Array.from(new Set([
            payload.packageNumber,
            ...(payload.packageNumbers || []),
            ...(payload.packages || []).map((item) => item.packageNumber),
            ...(payload.orderList || []).map((item) => item.packageNumber),
        ].filter((item) => Boolean(item?.trim()))));
        const packageTargets = [];
        if (packageNumbers.length > 0) {
            const packageRows = await this.prisma.erpOrderPackage.findMany({
                where: {
                    packageNumber: {
                        in: packageNumbers,
                    },
                },
                include: {
                    order: {
                        select: {
                            orderStatus: true,
                        },
                    },
                },
            });
            for (const row of packageRows) {
                packageTargets.push({
                    id: row.id,
                    shopId: row.shopId,
                    orderId: row.orderId,
                    orderNo: row.orderNo,
                    orderSn: row.orderSn,
                    orderStatus: row.order?.orderStatus || undefined,
                    siteCode: row.siteCode,
                    updatedAt: row.updatedAt.toISOString(),
                    packageNumber: row.packageNumber,
                    trackingNumber: row.trackingNumber || undefined,
                    shippingCarrier: row.shippingCarrier || undefined,
                    logisticsStatus: row.logisticsStatus || undefined,
                    logisticsChannelId: row.logisticsChannelId || undefined,
                    logisticsChannelName: row.logisticsChannelName || undefined,
                    serviceCode: row.serviceCode || undefined,
                    shippingDocumentStatus: row.shippingDocumentStatus || undefined,
                    shippingDocumentType: row.shippingDocumentType || undefined,
                    documentUrl: row.documentUrl || undefined,
                    downloadRef: row.downloadRef,
                    logisticsProfile: row.logisticsProfile || undefined,
                    parcelItemCount: row.parcelItemCount,
                    latestPackageUpdateTime: row.latestPackageUpdateTime?.toISOString(),
                    lastDocumentSyncTime: row.lastDocumentSyncTime?.toISOString(),
                    package: row.rawFragment && typeof row.rawFragment === 'object' && !Array.isArray(row.rawFragment)
                        ? row.rawFragment
                        : null,
                });
            }
        }
        const orderTargets = await this.resolveOrderTargets({
            orderId: payload.orderId,
            orderIds: payload.orderIds,
            orderNo: payload.orderNo,
            orderNos: [
                ...(payload.orderNos || []),
                ...(payload.orderSn ? [payload.orderSn] : []),
                ...(payload.packages || [])
                    .map((item) => item.orderNo || item.orderSn)
                    .filter((item) => Boolean(item)),
                ...(payload.orderList || [])
                    .map((item) => item.orderSn)
                    .filter((item) => Boolean(item)),
            ],
            shopId: payload.shopId,
        });
        if (orderTargets.length > 0) {
            const rows = await this.prisma.erpOrder.findMany({
                where: {
                    id: { in: orderTargets.map((item) => item.id) },
                },
                include: {
                    packages: true,
                },
            });
            for (const row of rows) {
                if (row.packages.length > 0) {
                    for (const pkg of row.packages) {
                        packageTargets.push({
                            id: pkg.id,
                            shopId: pkg.shopId,
                            orderId: pkg.orderId,
                            orderNo: pkg.orderNo,
                            orderSn: pkg.orderSn,
                            orderStatus: row.orderStatus,
                            siteCode: pkg.siteCode,
                            updatedAt: pkg.updatedAt.toISOString(),
                            packageNumber: pkg.packageNumber,
                            trackingNumber: pkg.trackingNumber || undefined,
                            shippingCarrier: pkg.shippingCarrier || undefined,
                            logisticsStatus: pkg.logisticsStatus || undefined,
                            logisticsChannelId: pkg.logisticsChannelId || undefined,
                            logisticsChannelName: pkg.logisticsChannelName || undefined,
                            serviceCode: pkg.serviceCode || undefined,
                            shippingDocumentStatus: pkg.shippingDocumentStatus || undefined,
                            shippingDocumentType: pkg.shippingDocumentType || undefined,
                            documentUrl: pkg.documentUrl || undefined,
                            downloadRef: pkg.downloadRef,
                            logisticsProfile: pkg.logisticsProfile || undefined,
                            parcelItemCount: pkg.parcelItemCount,
                            latestPackageUpdateTime: pkg.latestPackageUpdateTime?.toISOString(),
                            lastDocumentSyncTime: pkg.lastDocumentSyncTime?.toISOString(),
                            package: pkg.rawFragment && typeof pkg.rawFragment === 'object' && !Array.isArray(pkg.rawFragment)
                                ? pkg.rawFragment
                                : null,
                        });
                    }
                    continue;
                }
                const raw = row.rawJson && typeof row.rawJson === 'object' && !Array.isArray(row.rawJson)
                    ? row.rawJson
                    : {};
                const rawPackages = this.extractArray(raw, ['package_list', 'packageList']);
                if (rawPackages.length === 0) {
                    packageTargets.push({
                        shopId: row.shopId,
                        orderId: row.id,
                        orderNo: row.orderNo,
                        orderSn: this.pickString(raw, ['order_sn', 'orderSn']) || row.orderNo,
                        orderStatus: row.orderStatus,
                        siteCode: row.siteCode,
                        updatedAt: row.updatedAt.toISOString(),
                        packageNumber: this.pickString(raw, ['package_number', 'packageNumber']) || `${row.orderNo}-PKG1`,
                        trackingNumber: this.pickString(raw, ['tracking_number', 'trackingNumber']),
                        shippingCarrier: this.pickString(raw, ['shipping_carrier', 'shippingCarrier']),
                        logisticsStatus: this.pickString(raw, ['logistics_status', 'logisticsStatus']),
                        logisticsChannelId: this.pickNumber(raw, ['logistics_channel_id', 'logisticsChannelId']),
                        logisticsChannelName: this.pickString(raw, [
                            'logistics_channel_name',
                            'logisticsChannelName',
                        ]),
                        serviceCode: this.pickString(raw, ['service_code', 'serviceCode']),
                        logisticsProfile: this.deriveLogisticsProfile({
                            shippingCarrier: this.pickString(raw, ['shipping_carrier', 'shippingCarrier']),
                            logisticsChannelId: this.pickNumber(raw, ['logistics_channel_id', 'logisticsChannelId']),
                        }),
                        package: raw,
                    });
                    continue;
                }
                for (const item of rawPackages) {
                    const pkg = item;
                    packageTargets.push({
                        shopId: row.shopId,
                        orderId: row.id,
                        orderNo: row.orderNo,
                        orderSn: this.pickString(raw, ['order_sn', 'orderSn']) || row.orderNo,
                        orderStatus: row.orderStatus,
                        siteCode: row.siteCode,
                        updatedAt: row.updatedAt.toISOString(),
                        packageNumber: this.pickString(pkg, ['package_number', 'packageNumber']) || `${row.orderNo}-PKG1`,
                        trackingNumber: this.pickString(pkg, ['tracking_number', 'trackingNumber']),
                        shippingCarrier: this.pickString(pkg, ['shipping_carrier', 'shippingCarrier']),
                        logisticsStatus: this.pickString(pkg, ['logistics_status', 'logisticsStatus']),
                        logisticsChannelId: this.pickNumber(pkg, ['logistics_channel_id', 'logisticsChannelId']),
                        logisticsChannelName: this.pickString(pkg, [
                            'logistics_channel_name',
                            'logisticsChannelName',
                            'channel_name',
                        ]),
                        serviceCode: this.pickString(pkg, ['service_code', 'serviceCode']),
                        shippingDocumentStatus: this.pickString(pkg, [
                            'shipping_document_status',
                            'shippingDocumentStatus',
                        ]),
                        shippingDocumentType: this.pickString(pkg, [
                            'shipping_document_type',
                            'shippingDocumentType',
                        ]),
                        logisticsProfile: this.deriveLogisticsProfile({
                            shippingCarrier: this.pickString(pkg, ['shipping_carrier', 'shippingCarrier']),
                            logisticsChannelId: this.pickNumber(pkg, ['logistics_channel_id', 'logisticsChannelId']),
                        }),
                        package: pkg,
                    });
                }
            }
        }
        const unique = new Map();
        for (const target of packageTargets) {
            unique.set(target.packageNumber, target);
        }
        const filtered = Array.from(unique.values()).filter((target) => {
            if (!payload.shopId) {
                return true;
            }
            return target.shopId === payload.shopId;
        });
        if (filtered.length === 0 &&
            (payload.orderId ||
                payload.orderIds?.length ||
                payload.orderNo ||
                payload.orderNos?.length ||
                payload.orderSn ||
                payload.packageNumber ||
                payload.packageNumbers?.length)) {
            throw new common_1.NotFoundException('No Shopee package target resolved from payload.');
        }
        return filtered;
    }
    assertSingleTarget(targets, actionLabel) {
        if (targets.length === 0) {
            throw new common_1.NotFoundException(`No package found for ${actionLabel}.`);
        }
        if (targets.length > 1) {
            throw new common_1.BadRequestException(`${actionLabel} requires exactly one package target, received ${targets.length}.`);
        }
        return targets[0];
    }
    buildInvoiceGateState(target) {
        return this.normalizeShopeeOrderStatus(target.orderStatus) === 'PENDING_INVOICE'
            ? ['订单仍处于 PENDING_INVOICE，需先调用 add_invoice_data。']
            : [];
    }
    buildChannelStrategy(target) {
        const profile = target.logisticsProfile ||
            this.deriveLogisticsProfile({
                shippingCarrier: target.shippingCarrier,
                logisticsChannelId: target.logisticsChannelId,
            });
        if (profile === 'SHOPEE_XPRESS') {
            return {
                profile,
                packageKeyMode: 'PACKAGE_NUMBER',
                supportsSingle: true,
                supportsBatch: true,
                supportsMass: true,
                prefersMass: true,
                updateMode: 'pickup_only',
                notes: [
                    'Shopee Xpress 优先按 package_number 执行。',
                    '同仓同渠道批量场景优先走 mass API。',
                ],
            };
        }
        if (profile === 'DIRECT_DELIVERY') {
            return {
                profile,
                packageKeyMode: 'PACKAGE_NUMBER',
                supportsSingle: true,
                supportsBatch: true,
                supportsMass: true,
                prefersMass: false,
                updateMode: 'pickup_only',
                notes: [
                    'Direct Delivery 仍按 package_number 主键处理。',
                    '优先保留 pickup/address/time 调整能力。',
                ],
            };
        }
        return {
            profile: 'OTHER',
            packageKeyMode: 'PACKAGE_NUMBER',
            supportsSingle: true,
            supportsBatch: true,
            supportsMass: false,
            prefersMass: false,
            updateMode: 'pickup_only',
            notes: ['其他渠道走通用 Shopee logistics 语义，是否可批量以 Shopee 实际返回为准。'],
        };
    }
    buildParameterFallbackSnapshot(target, strategy, input) {
        return {
            source: input.source,
            checkedAt: new Date().toISOString(),
            logisticsProfile: strategy.profile,
            logisticsChannelId: target.logisticsChannelId,
            logisticsChannelName: target.logisticsChannelName,
            serviceCode: target.serviceCode,
            shippingMode: 'unknown',
            infoNeeded: {
                pickup: [],
                dropoff: [],
                nonIntegrated: [],
            },
            canShip: false,
            missingPreconditions: input.missingPreconditions,
            parameterSource: input.parameterSource,
            channelStrategy: strategy,
        };
    }
    normalizeShippingParameterResponse(input) {
        const responseBody = this.readNested(input.response, 'response') ||
            input.response;
        const infoNeeded = this.extractInfoNeededObject(responseBody);
        const strategy = this.buildChannelStrategy(input.target);
        const shippingMode = this.determineShippingMode({
            infoNeeded,
            pickup: this.pickObjectValue(responseBody, ['pickup']),
            dropoff: this.pickObjectValue(responseBody, ['dropoff']),
            nonIntegrated: this.pickObjectValue(responseBody, ['non_integrated']),
        });
        const missingPreconditions = this.buildParameterErrorsFromResponse(input.response, this.buildInvoiceGateState(input.target));
        return {
            source: input.source,
            checkedAt: new Date().toISOString(),
            logisticsProfile: strategy.profile,
            logisticsChannelId: input.target.logisticsChannelId,
            logisticsChannelName: input.target.logisticsChannelName,
            serviceCode: input.target.serviceCode,
            shippingMode,
            infoNeeded,
            canShip: missingPreconditions.length === 0 && shippingMode !== 'unknown',
            missingPreconditions,
            pickup: this.pickObjectValue(responseBody, ['pickup']) || undefined,
            dropoff: this.pickObjectValue(responseBody, ['dropoff']) || undefined,
            nonIntegrated: this.pickObjectValue(responseBody, ['non_integrated']) || undefined,
            parameterSource: `v2.logistics.${input.source}`,
            channelStrategy: strategy,
        };
    }
    normalizeMassShippingParameterResponse(input) {
        const responseBody = this.readNested(input.response, 'response') ||
            input.response;
        const strategy = this.buildChannelStrategy(input.group.targets[0]);
        const successList = this.extractArray(responseBody, ['success_list']).map((item) => ({
            packageNumber: this.pickString(item, [
                'package_number',
                'packageNumber',
            ]),
        }));
        const failList = this.extractArray(responseBody, ['fail_list']).map((item) => ({
            packageNumber: this.pickString(item, [
                'package_number',
                'packageNumber',
            ]),
            failReason: this.pickString(item, ['fail_reason', 'failReason']),
        }));
        const infoNeeded = this.extractInfoNeededObject(responseBody);
        const shippingMode = this.determineShippingMode({
            infoNeeded,
            pickup: this.pickObjectValue(responseBody, ['pickup']),
            dropoff: this.pickObjectValue(responseBody, ['dropoff']),
            nonIntegrated: this.pickObjectValue(responseBody, ['non_integrated']),
        });
        const missingPreconditions = failList
            .map((item) => item.failReason)
            .filter((item) => Boolean(item));
        return {
            checkedAt: new Date().toISOString(),
            logisticsProfile: strategy.profile,
            logisticsChannelId: input.group.logisticsChannelId,
            productLocationId: input.group.productLocationId,
            shippingMode,
            infoNeeded,
            canShip: failList.length === 0 && shippingMode !== 'unknown',
            missingPreconditions,
            pickup: this.pickObjectValue(responseBody, ['pickup']) || undefined,
            dropoff: this.pickObjectValue(responseBody, ['dropoff']) || undefined,
            nonIntegrated: this.pickObjectValue(responseBody, ['non_integrated']) || undefined,
            parameterSource: 'v2.logistics.get_mass_shipping_parameter',
            channelStrategy: strategy,
            successList,
            failList,
        };
    }
    async getSingleShippingParameterSnapshot(target) {
        const invoiceGate = this.buildInvoiceGateState(target);
        if (invoiceGate.length > 0) {
            return this.buildParameterFallbackSnapshot(target, this.buildChannelStrategy(target), {
                source: 'get_shipping_parameter',
                parameterSource: 'local_invoice_gate',
                missingPreconditions: invoiceGate,
            });
        }
        const { sdk } = await this.prepareShopSync(target.shopId);
        if (!sdk.logistics?.getShippingParameter) {
            throw new common_1.InternalServerErrorException('Shopee logistics.getShippingParameter is not available.');
        }
        const response = await sdk.logistics.getShippingParameter({
            order_sn: target.orderSn,
            package_number: target.packageNumber,
        });
        return this.normalizeShippingParameterResponse({
            source: 'get_shipping_parameter',
            response: response,
            target,
        });
    }
    async getShippingParameterSnapshots(targets) {
        const snapshots = [];
        for (const target of targets) {
            const invoiceGate = this.buildInvoiceGateState(target);
            if (invoiceGate.length > 0) {
                snapshots.push(this.buildParameterFallbackSnapshot(target, this.buildChannelStrategy(target), {
                    source: 'get_shipping_parameter',
                    parameterSource: 'local_invoice_gate',
                    missingPreconditions: invoiceGate,
                }));
                continue;
            }
            snapshots.push(await this.getSingleShippingParameterSnapshot(target));
        }
        return snapshots;
    }
    async getMassShippingParameterSnapshot(group) {
        const invoiceBlocked = group.targets.flatMap((target) => this.buildInvoiceGateState(target));
        if (invoiceBlocked.length > 0) {
            return {
                ...this.buildParameterFallbackSnapshot(group.targets[0], this.buildChannelStrategy(group.targets[0]), {
                    source: 'get_mass_shipping_parameter',
                    parameterSource: 'local_invoice_gate',
                    missingPreconditions: invoiceBlocked,
                }),
                logisticsChannelId: group.logisticsChannelId,
            };
        }
        const { sdk } = await this.prepareShopSync(group.shopId);
        if (!sdk.logistics?.getMassShippingParameter) {
            throw new common_1.InternalServerErrorException('Shopee logistics.getMassShippingParameter is not available.');
        }
        const response = await sdk.logistics.getMassShippingParameter({
            package_list: group.targets.map((target) => ({
                package_number: target.packageNumber,
            })),
            ...(group.logisticsChannelId ? { logistics_channel_id: group.logisticsChannelId } : {}),
            ...(group.productLocationId ? { product_location_id: group.productLocationId } : {}),
        });
        return this.normalizeMassShippingParameterResponse({
            response: response,
            group: {
                ...group,
                groupKey: `${group.shopId}:${group.logisticsChannelId || 'AUTO'}:${group.productLocationId || 'AUTO'}`,
            },
        });
    }
    assertShippableTargets(targets, snapshots) {
        const errors = targets.flatMap((target, index) => snapshots[index]?.canShip
            ? []
            : [`${target.packageNumber}: ${(snapshots[index]?.missingPreconditions || []).join('；')}`]);
        if (errors.length > 0) {
            throw new common_1.BadRequestException(errors.join(' | '));
        }
    }
    assertSingleShippingMode(snapshots, apiName) {
        const modes = Array.from(new Set(snapshots.map((item) => item.shippingMode)));
        if (modes.length !== 1 || modes[0] === 'unknown') {
            throw new common_1.BadRequestException(`${apiName} requires one consistent shipping mode, received ${modes.join(', ') || 'unknown'}.`);
        }
        return modes[0];
    }
    buildSingleShipPayload(target, snapshot, payload) {
        return {
            order_sn: target.orderSn,
            package_number: target.packageNumber,
            ...this.buildSharedShipModePayload(snapshot.shippingMode, snapshot, payload, [target]),
        };
    }
    buildSharedShipModePayload(mode, snapshot, payload, targets) {
        if (mode === 'pickup') {
            const pickup = this.buildPickupPayload(snapshot, payload);
            return {
                pickup,
            };
        }
        if (mode === 'dropoff') {
            const dropoff = this.buildDropoffPayload(snapshot, payload);
            return {
                dropoff,
            };
        }
        if (mode === 'non_integrated') {
            return {
                non_integrated: this.buildNonIntegratedPayload(payload, targets),
            };
        }
        throw new common_1.BadRequestException('Unable to determine shipping mode payload.');
    }
    buildMassShipModePayload(mode, snapshot, payload, targets) {
        if (mode === 'pickup') {
            return {
                pickup: this.buildPickupPayload(snapshot, payload),
            };
        }
        if (mode === 'dropoff') {
            return {
                dropoff: this.buildDropoffPayload(snapshot, payload),
            };
        }
        if (mode === 'non_integrated') {
            return {
                non_integrated: this.buildNonIntegratedPayload(payload, targets),
            };
        }
        throw new common_1.BadRequestException('Unable to determine mass shipping mode payload.');
    }
    buildPickupPayload(snapshot, payload) {
        const pickup = this.pickObjectValue(snapshot.pickup || {}, ['address_list']) || {};
        const addressList = this.extractArray(snapshot.pickup || {}, ['address_list']);
        const timeSlotList = this.extractArray(snapshot.pickup || {}, ['time_slot_list']);
        return {
            address_id: payload.pickup?.addressId ||
                this.pickNumber(addressList[0] || {}, ['address_id', 'addressId']),
            pickup_time_id: payload.pickup?.pickupTimeId ||
                this.pickString(timeSlotList.find((item) => this.extractArray(item, ['flags']).includes('recommended')), ['pickup_time_id', 'pickupTimeId']) ||
                this.pickString(timeSlotList[0] || {}, ['pickup_time_id', 'pickupTimeId']),
            ...(payload.pickup &&
                'trackingNumber' in payload.pickup &&
                typeof payload.pickup.trackingNumber === 'string' &&
                payload.pickup.trackingNumber
                ? { tracking_number: payload.pickup.trackingNumber }
                : {}),
        };
    }
    buildDropoffPayload(snapshot, payload) {
        const branchList = this.extractArray(snapshot.dropoff || {}, ['branch_list']);
        return {
            branch_id: payload.dropoff?.branchId ||
                this.pickNumber(branchList[0] || {}, ['branch_id', 'branchId']),
            ...(payload.dropoff?.senderRealName
                ? { sender_real_name: payload.dropoff.senderRealName }
                : {}),
            ...(payload.dropoff?.trackingNumber || payload.trackingNo
                ? { tracking_number: payload.dropoff?.trackingNumber || payload.trackingNo }
                : {}),
        };
    }
    buildNonIntegratedPayload(payload, targets) {
        if (payload.nonIntegrated?.trackingList?.length) {
            return {
                tracking_number: payload.nonIntegrated.trackingList.map((item) => ({
                    package_number: item.packageNumber,
                    tracking_number: item.trackingNumber,
                })),
            };
        }
        const trackingNumber = payload.nonIntegrated?.trackingNumber || payload.trackingNo || undefined;
        if (!trackingNumber) {
            throw new common_1.BadRequestException('non_integrated 发货需要提供 trackingNo 或 nonIntegrated.trackingNumber。');
        }
        if (targets.length === 1) {
            return {
                tracking_number: trackingNumber,
            };
        }
        return {
            tracking_number: targets.map((target) => ({
                package_number: target.packageNumber,
                tracking_number: trackingNumber,
            })),
        };
    }
    buildUpdatePickupPayload(snapshot, payload) {
        const pickup = this.buildPickupPayload(snapshot, payload);
        if (!pickup.address_id || !pickup.pickup_time_id) {
            throw new common_1.BadRequestException('update_shipping_order 需要有效的 pickup.addressId 和 pickup.pickupTimeId。');
        }
        return pickup;
    }
    groupTargetsByShopAndMode(targets) {
        const groups = new Map();
        for (const target of targets) {
            const key = target.shopId;
            const current = groups.get(key) || [];
            current.push(target);
            groups.set(key, current);
        }
        return Array.from(groups.entries()).map(([shopId, rows]) => ({
            shopId,
            targets: rows,
        }));
    }
    groupTargetsForMassAction(targets, payload = {}) {
        const groups = new Map();
        for (const target of targets) {
            const logisticsChannelId = payload.logisticsChannelId ||
                target.logisticsChannelId ||
                this.pickNumber(target.package || {}, ['logistics_channel_id', 'logisticsChannelId']);
            const productLocationId = payload.productLocationId || this.extractPackageProductLocationId(target);
            const groupKey = `${target.shopId}:${logisticsChannelId || 'AUTO'}:${productLocationId || 'AUTO'}`;
            const current = groups.get(groupKey) || {
                groupKey,
                shopId: target.shopId,
                logisticsChannelId,
                productLocationId,
                targets: [],
            };
            current.targets.push(target);
            groups.set(groupKey, current);
        }
        return Array.from(groups.values());
    }
    extractPackageProductLocationId(target) {
        const itemList = this.extractArray(target.package || {}, ['item_list', 'itemList']);
        return this.pickString(itemList[0], [
            'product_location_id',
            'productLocationId',
        ]);
    }
    async refreshUniqueOrdersWithoutLog(targets, triggerType, requestPayloadSummary) {
        const byOrder = new Map();
        for (const target of targets) {
            if (!byOrder.has(target.orderNo)) {
                byOrder.set(target.orderNo, target);
            }
        }
        const summaries = new Map();
        for (const target of byOrder.values()) {
            const refreshed = await this.refreshOrderDetailWithoutLog(target.shopId, target.orderNo, {
                triggerType,
                requestPayloadSummary,
            });
            if (refreshed) {
                summaries.set(target.orderNo, refreshed);
            }
        }
        return summaries;
    }
    async patchPackageTrackingData(target, trackingPayload) {
        const existing = await this.prisma.erpOrderPackage.findUnique({
            where: {
                packageNumber: target.packageNumber,
            },
        });
        const now = new Date();
        const trackingNumber = this.pickString(trackingPayload, ['tracking_number']);
        const baseRaw = existing?.rawFragment && typeof existing.rawFragment === 'object' && !Array.isArray(existing.rawFragment)
            ? existing.rawFragment
            : target.package || {};
        const nextRaw = {
            ...baseRaw,
            ...(trackingNumber !== undefined ? { tracking_number: trackingNumber } : {}),
            ...(this.pickString(trackingPayload, ['plp_number'])
                ? { plp_number: this.pickString(trackingPayload, ['plp_number']) }
                : {}),
            ...(this.pickString(trackingPayload, ['first_mile_tracking_number'])
                ? {
                    first_mile_tracking_number: this.pickString(trackingPayload, [
                        'first_mile_tracking_number',
                    ]),
                }
                : {}),
            ...(this.pickString(trackingPayload, ['last_mile_tracking_number'])
                ? {
                    last_mile_tracking_number: this.pickString(trackingPayload, [
                        'last_mile_tracking_number',
                    ]),
                }
                : {}),
            ...(this.pickString(trackingPayload, ['hint'])
                ? { tracking_sync_hint: this.pickString(trackingPayload, ['hint']) }
                : {}),
            ...(this.pickString(trackingPayload, ['pickup_code'])
                ? { pickup_code: this.pickString(trackingPayload, ['pickup_code']) }
                : {}),
            last_tracking_sync_time: now.toISOString(),
        };
        await this.prisma.erpOrderPackage.upsert({
            where: {
                packageNumber: target.packageNumber,
            },
            create: {
                channel: client_1.ChannelCode.SHOPEE,
                siteCode: target.siteCode || 'BR',
                shopId: target.shopId,
                orderId: target.orderId || undefined,
                orderNo: target.orderNo,
                orderSn: target.orderSn,
                packageNumber: target.packageNumber,
                trackingNumber,
                packageStatus: this.pickString(baseRaw, ['package_status', 'packageStatus']) || undefined,
                packageFulfillmentStatus: this.pickString(baseRaw, ['fulfillment_status', 'packageFulfillmentStatus']) || undefined,
                logisticsStatus: target.logisticsStatus ||
                    this.pickString(baseRaw, ['logistics_status', 'logisticsStatus']) ||
                    undefined,
                shippingCarrier: target.shippingCarrier ||
                    this.pickString(baseRaw, ['shipping_carrier', 'shippingCarrier']) ||
                    undefined,
                logisticsChannelId: target.logisticsChannelId ||
                    this.pickNumber(baseRaw, ['logistics_channel_id', 'logisticsChannelId']) ||
                    undefined,
                logisticsChannelName: target.logisticsChannelName ||
                    this.pickString(baseRaw, ['logistics_channel_name', 'logisticsChannelName']) ||
                    undefined,
                serviceCode: target.serviceCode || this.pickString(baseRaw, ['service_code', 'serviceCode']) || undefined,
                shippingDocumentStatus: target.shippingDocumentStatus ||
                    this.pickString(baseRaw, ['shipping_document_status', 'shippingDocumentStatus']) ||
                    undefined,
                shippingDocumentType: target.shippingDocumentType ||
                    this.pickString(baseRaw, ['shipping_document_type', 'shippingDocumentType']) ||
                    undefined,
                documentUrl: target.documentUrl || undefined,
                downloadRef: target.downloadRef ||
                    existing?.downloadRef,
                logisticsProfile: target.logisticsProfile ||
                    this.deriveLogisticsProfile({
                        shippingCarrier: target.shippingCarrier,
                        logisticsChannelId: target.logisticsChannelId,
                    }),
                parcelItemCount: target.parcelItemCount || 0,
                latestPackageUpdateTime: now,
                lastDocumentSyncTime: existing?.lastDocumentSyncTime || undefined,
                rawFragment: nextRaw,
                sourceRaw: existing?.sourceRaw ||
                    target.package,
                lastSyncTime: now,
            },
            update: {
                ...(trackingNumber !== undefined ? { trackingNumber } : {}),
                rawFragment: nextRaw,
                latestPackageUpdateTime: now,
                lastSyncTime: now,
            },
        });
    }
    scheduleTrackingRetry(target, options) {
        const attempt = options.attempt ?? 1;
        const maxAttempts = options.maxAttempts ?? TRACKING_RETRY_MAX_ATTEMPTS;
        const intervalMs = options.intervalMs ?? TRACKING_RETRY_INTERVAL_MS;
        if (!target.packageNumber || attempt > maxAttempts) {
            return;
        }
        const existing = this.scheduledTrackingRetryTimers.get(target.packageNumber);
        if (existing) {
            clearTimeout(existing);
        }
        const timer = setTimeout(() => {
            this.scheduledTrackingRetryTimers.delete(target.packageNumber);
            void this.runScheduledTrackingRetry(target, {
                sourceTrigger: options.sourceTrigger,
                attempt,
                maxAttempts,
                intervalMs,
            });
        }, intervalMs);
        this.scheduledTrackingRetryTimers.set(target.packageNumber, timer);
        this.logger.log(`Scheduled tracking retry ${attempt}/${maxAttempts} for ${target.packageNumber} in ${Math.round(intervalMs / 60000)} minutes.`);
    }
    async runScheduledTrackingRetry(target, options) {
        const latest = await this.prisma.erpOrderPackage.findUnique({
            where: {
                packageNumber: target.packageNumber,
            },
        });
        if (latest?.trackingNumber) {
            this.logger.log(`Skip scheduled tracking retry for ${target.packageNumber}; tracking number already exists.`);
            return;
        }
        const retryTarget = {
            ...target,
            ...(latest
                ? {
                    shopId: latest.shopId,
                    orderId: latest.orderId,
                    orderNo: latest.orderNo,
                    orderSn: latest.orderSn,
                    siteCode: latest.siteCode,
                    trackingNumber: latest.trackingNumber || undefined,
                    shippingCarrier: latest.shippingCarrier || undefined,
                    logisticsStatus: latest.logisticsStatus || undefined,
                    logisticsChannelId: latest.logisticsChannelId || undefined,
                    logisticsChannelName: latest.logisticsChannelName || undefined,
                    serviceCode: latest.serviceCode || undefined,
                    shippingDocumentStatus: latest.shippingDocumentStatus || undefined,
                    shippingDocumentType: latest.shippingDocumentType || undefined,
                    documentUrl: latest.documentUrl || undefined,
                    downloadRef: latest.downloadRef,
                    logisticsProfile: latest.logisticsProfile || undefined,
                    parcelItemCount: latest.parcelItemCount,
                    latestPackageUpdateTime: latest.latestPackageUpdateTime?.toISOString(),
                    lastDocumentSyncTime: latest.lastDocumentSyncTime?.toISOString(),
                    package: latest.rawFragment &&
                        typeof latest.rawFragment === 'object' &&
                        !Array.isArray(latest.rawFragment)
                        ? latest.rawFragment
                        : target.package,
                }
                : {}),
        };
        try {
            const result = await this.getTrackingNumberInternal({
                shopId: retryTarget.shopId,
                orderId: retryTarget.orderId || undefined,
                orderNo: retryTarget.orderNo,
                orderSn: retryTarget.orderSn,
                packageNumber: retryTarget.packageNumber,
                responseOptionalFields: TRACKING_RESPONSE_OPTIONAL_FIELDS,
            }, {
                triggerType: 'tracking_retry',
                requestPayloadSummary: {
                    sourceTrigger: options.sourceTrigger,
                    scheduledAttempt: options.attempt,
                    scheduledMaxAttempts: options.maxAttempts,
                    scheduledIntervalMinutes: Math.round(options.intervalMs / 60000),
                },
            });
            const trackingNumber = this.pickString(result.data, [
                'trackingNumber',
            ]);
            if (trackingNumber) {
                return;
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown scheduled tracking retry error';
            await this.writeSyncLogs([
                {
                    triggerType: 'tracking_retry',
                    shopId: retryTarget.shopId,
                    orderNo: retryTarget.orderNo,
                    orderSn: retryTarget.orderSn,
                    packageNumber: retryTarget.packageNumber,
                    requestPayloadSummary: {
                        sourceTrigger: options.sourceTrigger,
                        scheduledAttempt: options.attempt,
                        scheduledMaxAttempts: options.maxAttempts,
                        scheduledIntervalMinutes: Math.round(options.intervalMs / 60000),
                    },
                    resultStatus: 'failed',
                    changedFields: [],
                    detailSource: 'REALTIME_SYNCED',
                    packageSource: 'REALTIME_SYNCED',
                    message: `Scheduled tracking retry ${options.attempt}/${options.maxAttempts} failed for ${retryTarget.packageNumber}: ${message}`,
                },
            ]);
            this.logger.warn(`Scheduled tracking retry ${options.attempt}/${options.maxAttempts} failed for ${retryTarget.packageNumber}: ${message}`);
        }
        if (options.attempt >= options.maxAttempts) {
            this.logger.warn(`Tracking retry exhausted for ${retryTarget.packageNumber} after ${options.maxAttempts} attempts.`);
            return;
        }
        this.scheduleTrackingRetry(retryTarget, {
            sourceTrigger: options.sourceTrigger,
            attempt: options.attempt + 1,
            maxAttempts: options.maxAttempts,
            intervalMs: options.intervalMs,
        });
    }
    extractInfoNeededObject(source) {
        const infoNeeded = this.readNested(source, 'info_needed') ||
            {};
        return {
            pickup: this.extractArray(infoNeeded, ['pickup']).filter((item) => typeof item === 'string'),
            dropoff: this.extractArray(infoNeeded, ['dropoff']).filter((item) => typeof item === 'string'),
            nonIntegrated: this.extractArray(infoNeeded, ['non_integrated']).filter((item) => typeof item === 'string'),
        };
    }
    determineShippingMode(input) {
        if (input.pickup ||
            input.infoNeeded.pickup.length > 0) {
            return 'pickup';
        }
        if (input.dropoff ||
            input.infoNeeded.dropoff.length > 0) {
            return 'dropoff';
        }
        if (input.nonIntegrated ||
            input.infoNeeded.nonIntegrated.length > 0) {
            return 'non_integrated';
        }
        return 'unknown';
    }
    buildParameterErrorsFromResponse(response, seed = []) {
        const errors = [...seed];
        const topError = this.pickString(response, ['message']);
        if (this.pickString(response, ['error']) && topError) {
            errors.push(topError);
        }
        return Array.from(new Set(errors.filter((item) => item.trim())));
    }
    pickObjectValue(source, keys) {
        for (const key of keys) {
            const value = this.readNested(source, key);
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return value;
            }
        }
        return undefined;
    }
    async createShippingDocumentInternal(payload, context) {
        const targets = await this.getShippingDocumentTargets(payload);
        if (targets.length === 0) {
            throw new common_1.NotFoundException('No packages found for shipping document creation.');
        }
        const groups = this.groupShippingDocumentTargets(targets);
        let processed = 0;
        let logsWritten = 0;
        const failed = [];
        for (const [groupKey, groupTargets] of groups.entries()) {
            const firstTarget = groupTargets[0];
            const shopId = firstTarget?.shopId;
            if (!shopId || !firstTarget) {
                continue;
            }
            let shippingDocumentType = firstTarget.shippingDocumentType;
            try {
                const { sdk } = await this.prepareShopSync(shopId);
                if (!sdk.logistics?.createShippingDocument) {
                    throw new common_1.InternalServerErrorException('Shopee logistics.createShippingDocument is not available.');
                }
                shippingDocumentType =
                    shippingDocumentType || (await this.resolveShippingDocumentType(firstTarget));
                await sdk.logistics.createShippingDocument({
                    order_list: groupTargets.map((item) => ({
                        order_sn: item.orderSn,
                        package_number: item.packageNumber,
                    })),
                    shipping_document_type: shippingDocumentType,
                });
                for (const target of groupTargets) {
                    await this.upsertPackageMasterFromDocumentSync({
                        packageContext: target,
                        shippingDocumentType,
                        documentStatus: 'REQUESTED',
                        downloadRef: {
                            order_list: [
                                {
                                    order_sn: target.orderSn,
                                    package_number: target.packageNumber,
                                },
                            ],
                            shipping_document_type: shippingDocumentType,
                        },
                        message: `Shipping document requested via ${context.triggerType}.`,
                    });
                }
                processed += groupTargets.length;
                logsWritten += await this.writeSyncLogs(groupTargets.map((target) => ({
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: {
                        ...context.requestPayloadSummary,
                        shippingDocumentType,
                        groupKey,
                    },
                    resultStatus: 'success',
                    changedFields: ['shipping_document_status', 'shipping_document_type', 'document_url'],
                    detailSource: 'REALTIME_SYNCED',
                    packageSource: 'REALTIME_SYNCED',
                    message: `Shipping document requested for ${target.packageNumber}.`,
                })));
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown shipping document creation error';
                this.logger.warn(`Shipping document create failed for ${groupKey}: ${message}`);
                const effectiveType = shippingDocumentType || 'NORMAL_AIR_WAYBILL';
                for (const target of groupTargets) {
                    await this.upsertPackageMasterFromDocumentSync({
                        packageContext: target,
                        shippingDocumentType: effectiveType,
                        documentStatus: 'FAILED',
                        downloadRef: {
                            order_list: [
                                {
                                    order_sn: target.orderSn,
                                    package_number: target.packageNumber,
                                },
                            ],
                            shipping_document_type: effectiveType,
                        },
                        message,
                    });
                }
                failed.push(...groupTargets.map((item) => item.packageNumber));
                logsWritten += await this.writeSyncLogs(groupTargets.map((target) => ({
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: context.requestPayloadSummary,
                    resultStatus: 'failed',
                    message,
                })));
            }
        }
        const result = await this.syncShippingDocumentResultInternal(payload, context, targets);
        return {
            success: failed.length === 0 && result.success,
            scope: 'shipping_document_create',
            requested: processed,
            failed,
            resultSynced: result.synced,
            logsWritten: logsWritten + result.logsWritten,
        };
    }
    async syncShippingDocumentResultInternal(payload, context, preloadedTargets) {
        const targets = preloadedTargets || (await this.getShippingDocumentTargets(payload));
        if (targets.length === 0) {
            throw new common_1.NotFoundException('No packages found for shipping document result sync.');
        }
        const groups = this.groupShippingDocumentTargets(targets);
        let synced = 0;
        let logsWritten = 0;
        const failed = [];
        for (const [groupKey, groupTargets] of groups.entries()) {
            const firstTarget = groupTargets[0];
            const shopId = firstTarget?.shopId;
            if (!shopId || !firstTarget) {
                continue;
            }
            let shippingDocumentType = firstTarget.shippingDocumentType;
            try {
                const { sdk } = await this.prepareShopSync(shopId);
                if (!sdk.logistics?.getShippingDocumentResult) {
                    throw new common_1.InternalServerErrorException('Shopee logistics.getShippingDocumentResult is not available.');
                }
                shippingDocumentType =
                    shippingDocumentType || (await this.resolveShippingDocumentType(firstTarget));
                const response = await sdk.logistics.getShippingDocumentResult({
                    order_list: groupTargets.map((item) => ({
                        order_sn: item.orderSn,
                        package_number: item.packageNumber,
                    })),
                    shipping_document_type: shippingDocumentType,
                });
                const resultRows = this.extractArray(response, [
                    'response.result_list',
                    'result_list',
                    'data.result_list',
                ]);
                const resultByOrderSn = new Map(resultRows.map((row) => {
                    const orderSn = this.pickString(row, ['order_sn', 'orderSn']) || (0, node_crypto_1.randomUUID)();
                    return [orderSn, row];
                }));
                for (const target of groupTargets) {
                    const resultRow = resultByOrderSn.get(target.orderSn);
                    const documentStatus = this.pickString(resultRow || {}, ['status']) || 'REQUESTED';
                    const documentMessage = this.pickString(resultRow || {}, ['error']) || undefined;
                    await this.upsertPackageMasterFromDocumentSync({
                        packageContext: target,
                        shippingDocumentType,
                        documentStatus,
                        downloadRef: {
                            order_list: [
                                {
                                    order_sn: target.orderSn,
                                    package_number: target.packageNumber,
                                },
                            ],
                            shipping_document_type: shippingDocumentType,
                        },
                        message: documentMessage,
                    });
                }
                synced += groupTargets.length;
                logsWritten += await this.writeSyncLogs(groupTargets.map((target) => {
                    const resultRow = resultByOrderSn.get(target.orderSn);
                    return {
                        triggerType: context.triggerType,
                        shopId: target.shopId,
                        orderNo: target.orderNo,
                        orderSn: target.orderSn,
                        packageNumber: target.packageNumber,
                        requestPayloadSummary: {
                            ...context.requestPayloadSummary,
                            shippingDocumentType,
                            groupKey,
                        },
                        resultStatus: this.pickString(resultRow || {}, ['error']) ? 'partial' : 'success',
                        changedFields: [
                            'shipping_document_status',
                            'shipping_document_type',
                            'document_url',
                            'last_document_sync_time',
                        ],
                        detailSource: 'REALTIME_SYNCED',
                        packageSource: 'REALTIME_SYNCED',
                        message: this.pickString(resultRow || {}, ['error']) ||
                            `Shipping document result synced for ${target.packageNumber}.`,
                    };
                }));
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown shipping document result sync error';
                this.logger.warn(`Shipping document result sync failed for ${groupKey}: ${message}`);
                const effectiveType = shippingDocumentType || 'NORMAL_AIR_WAYBILL';
                for (const target of groupTargets) {
                    await this.upsertPackageMasterFromDocumentSync({
                        packageContext: target,
                        shippingDocumentType: effectiveType,
                        documentStatus: 'FAILED',
                        downloadRef: {
                            order_list: [
                                {
                                    order_sn: target.orderSn,
                                    package_number: target.packageNumber,
                                },
                            ],
                            shipping_document_type: effectiveType,
                        },
                        message,
                    });
                }
                failed.push(...groupTargets.map((item) => item.packageNumber));
                logsWritten += await this.writeSyncLogs(groupTargets.map((target) => ({
                    triggerType: context.triggerType,
                    shopId: target.shopId,
                    orderNo: target.orderNo,
                    orderSn: target.orderSn,
                    packageNumber: target.packageNumber,
                    requestPayloadSummary: context.requestPayloadSummary,
                    resultStatus: 'failed',
                    message,
                })));
            }
        }
        return {
            success: failed.length === 0,
            scope: 'shipping_document_result',
            synced,
            failed,
            logsWritten,
        };
    }
    async getShippingDocumentTargets(payload) {
        const packageNumbers = Array.from(new Set([payload.packageNumber, ...(payload.packageNumbers || [])].filter((item) => Boolean(item))));
        const packageTargets = [];
        if (packageNumbers.length > 0) {
            const packageRows = await this.prisma.erpOrderPackage.findMany({
                where: {
                    packageNumber: {
                        in: packageNumbers,
                    },
                },
            });
            for (const row of packageRows) {
                packageTargets.push({
                    id: row.id,
                    shopId: row.shopId,
                    orderId: row.orderId,
                    orderNo: row.orderNo,
                    orderSn: row.orderSn,
                    packageNumber: row.packageNumber,
                    trackingNumber: row.trackingNumber || undefined,
                    shippingCarrier: row.shippingCarrier || undefined,
                    logisticsStatus: row.logisticsStatus || undefined,
                    logisticsChannelId: row.logisticsChannelId || undefined,
                    logisticsChannelName: row.logisticsChannelName || undefined,
                    serviceCode: row.serviceCode || undefined,
                    shippingDocumentStatus: row.shippingDocumentStatus || undefined,
                    shippingDocumentType: payload.shippingDocumentType || row.shippingDocumentType || undefined,
                    documentUrl: row.documentUrl || undefined,
                    downloadRef: row.downloadRef,
                    logisticsProfile: row.logisticsProfile || undefined,
                    parcelItemCount: row.parcelItemCount,
                    latestPackageUpdateTime: row.latestPackageUpdateTime?.toISOString(),
                    lastDocumentSyncTime: row.lastDocumentSyncTime?.toISOString(),
                });
            }
            const missingPackageNumbers = packageNumbers.filter((packageNumber) => !packageTargets.some((target) => target.packageNumber === packageNumber));
            for (const packageNumber of missingPackageNumbers) {
                const fallbackContext = await this.findOrderByPackageNumber(packageNumber);
                if (fallbackContext) {
                    packageTargets.push({
                        ...fallbackContext,
                        shippingDocumentType: payload.shippingDocumentType || fallbackContext.shippingDocumentType,
                    });
                }
            }
        }
        if (packageTargets.length > 0) {
            return packageTargets;
        }
        const orderTargets = await this.resolveOrderTargets(payload);
        if (orderTargets.length === 0) {
            return [];
        }
        const orderRows = await this.prisma.erpOrder.findMany({
            where: {
                id: { in: orderTargets.map((item) => item.id) },
            },
            include: {
                packages: true,
            },
        });
        return orderRows.flatMap((row) => {
            if (row.packages.length > 0) {
                return row.packages.map((pkg) => ({
                    id: pkg.id,
                    shopId: pkg.shopId,
                    orderId: pkg.orderId,
                    orderNo: pkg.orderNo,
                    orderSn: pkg.orderSn,
                    packageNumber: pkg.packageNumber,
                    shippingDocumentType: payload.shippingDocumentType || pkg.shippingDocumentType || undefined,
                    shippingDocumentStatus: pkg.shippingDocumentStatus || undefined,
                    documentUrl: pkg.documentUrl || undefined,
                    downloadRef: pkg.downloadRef,
                    parcelItemCount: pkg.parcelItemCount,
                    latestPackageUpdateTime: pkg.latestPackageUpdateTime?.toISOString(),
                    lastDocumentSyncTime: pkg.lastDocumentSyncTime?.toISOString(),
                }));
            }
            const raw = row.rawJson && typeof row.rawJson === 'object' && !Array.isArray(row.rawJson)
                ? row.rawJson
                : {};
            return this.extractArray(raw, ['package_list', 'packageList']).map((item) => {
                const pkg = item;
                const packageNumber = this.pickString(pkg, ['package_number', 'packageNumber']) ||
                    `${row.orderNo}-PKG1`;
                return {
                    shopId: row.shopId,
                    orderId: row.id,
                    orderNo: row.orderNo,
                    orderSn: this.pickString(raw, ['order_sn', 'orderSn']) || row.orderNo,
                    orderStatus: row.orderStatus,
                    siteCode: row.siteCode,
                    updatedAt: row.updatedAt.toISOString(),
                    packageNumber,
                    trackingNumber: this.pickString(pkg, ['tracking_number', 'trackingNumber']),
                    shippingCarrier: this.pickString(pkg, ['shipping_carrier', 'shippingCarrier']),
                    logisticsStatus: this.pickString(pkg, ['logistics_status', 'logisticsStatus']),
                    logisticsChannelId: this.pickNumber(pkg, [
                        'logistics_channel_id',
                        'logisticsChannelId',
                    ]),
                    logisticsChannelName: this.pickString(pkg, [
                        'logistics_channel_name',
                        'logisticsChannelName',
                    ]),
                    serviceCode: this.pickString(pkg, ['service_code', 'serviceCode']),
                    shippingDocumentStatus: this.pickString(pkg, [
                        'shipping_document_status',
                        'shippingDocumentStatus',
                    ]),
                    shippingDocumentType: payload.shippingDocumentType ||
                        this.pickString(pkg, ['shipping_document_type', 'shippingDocumentType']),
                    package: pkg,
                };
            });
        });
    }
    groupShippingDocumentTargets(targets) {
        const groups = new Map();
        for (const target of targets) {
            const key = `${target.shopId}:${target.shippingDocumentType || 'AUTO'}`;
            const current = groups.get(key) || [];
            current.push(target);
            groups.set(key, current);
        }
        return groups;
    }
    async resolveShippingDocumentType(target) {
        if (target.shippingDocumentType) {
            return target.shippingDocumentType;
        }
        const { sdk } = await this.prepareShopSync(target.shopId);
        if (sdk.logistics?.getShippingDocumentParameter) {
            try {
                const response = await sdk.logistics.getShippingDocumentParameter({
                    order_list: [
                        {
                            order_sn: target.orderSn,
                            package_number: target.packageNumber,
                        },
                    ],
                });
                const suggested = this.pickString(response, [
                    'response.suggested_shipping_document_type',
                    'suggested_shipping_document_type',
                    'data.suggested_shipping_document_type',
                ]) ||
                    this.extractArray(response, [
                        'response.selectable_shipping_document_type',
                        'selectable_shipping_document_type',
                        'data.selectable_shipping_document_type',
                    ]).find((item) => typeof item === 'string');
                if (suggested) {
                    return suggested;
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown shipping document parameter error';
                this.logger.warn(`Shipping document parameter lookup failed for ${target.packageNumber}: ${message}`);
            }
        }
        return 'NORMAL_AIR_WAYBILL';
    }
    async upsertPackageMasterFromDocumentSync(input) {
        const now = new Date();
        const documentUrl = this.buildShippingDocumentDownloadUrl(input.packageContext.packageNumber, input.shippingDocumentType);
        const existing = await this.prisma.erpOrderPackage.findUnique({
            where: {
                packageNumber: input.packageContext.packageNumber,
            },
        });
        const baseRawFragment = existing?.rawFragment && typeof existing.rawFragment === 'object' && !Array.isArray(existing.rawFragment)
            ? existing.rawFragment
            : input.packageContext.package || {};
        const nextRawFragment = {
            ...baseRawFragment,
            package_number: input.packageContext.packageNumber,
            shipping_document_status: input.documentStatus ||
                input.packageContext.shippingDocumentStatus ||
                this.pickString(baseRawFragment, ['shipping_document_status', 'shippingDocumentStatus']),
            shipping_document_type: input.shippingDocumentType,
            document_url: documentUrl,
            last_document_sync_time: now.toISOString(),
        };
        await this.prisma.erpOrderPackage.upsert({
            where: {
                packageNumber: input.packageContext.packageNumber,
            },
            create: {
                channel: client_1.ChannelCode.SHOPEE,
                siteCode: input.packageContext.siteCode || 'BR',
                shopId: input.packageContext.shopId,
                orderId: input.packageContext.orderId || undefined,
                orderNo: input.packageContext.orderNo,
                orderSn: input.packageContext.orderSn,
                packageNumber: input.packageContext.packageNumber,
                trackingNumber: input.packageContext.trackingNumber,
                packageStatus: input.packageContext.package
                    ? this.pickString(input.packageContext.package, ['package_status', 'packageStatus'])
                    : undefined,
                packageFulfillmentStatus: input.packageContext.package
                    ? this.pickString(input.packageContext.package, ['fulfillment_status', 'packageFulfillmentStatus'])
                    : undefined,
                logisticsStatus: input.packageContext.logisticsStatus,
                shippingCarrier: input.packageContext.shippingCarrier,
                logisticsChannelId: input.packageContext.logisticsChannelId,
                logisticsChannelName: input.packageContext.logisticsChannelName,
                serviceCode: input.packageContext.serviceCode,
                shippingDocumentStatus: input.documentStatus || input.packageContext.shippingDocumentStatus,
                shippingDocumentType: input.shippingDocumentType,
                documentUrl,
                downloadRef: input.downloadRef,
                logisticsProfile: input.packageContext.logisticsProfile,
                parcelItemCount: input.packageContext.parcelItemCount || 0,
                latestPackageUpdateTime: input.packageContext.latestPackageUpdateTime
                    ? new Date(input.packageContext.latestPackageUpdateTime)
                    : undefined,
                lastDocumentSyncTime: now,
                rawFragment: nextRawFragment,
                sourceRaw: input.packageContext.package
                    ? input.packageContext.package
                    : undefined,
                lastSyncTime: now,
            },
            update: {
                orderId: input.packageContext.orderId || existing?.orderId || undefined,
                orderNo: input.packageContext.orderNo,
                orderSn: input.packageContext.orderSn,
                trackingNumber: input.packageContext.trackingNumber || existing?.trackingNumber || undefined,
                logisticsStatus: input.packageContext.logisticsStatus || existing?.logisticsStatus || undefined,
                shippingCarrier: input.packageContext.shippingCarrier || existing?.shippingCarrier || undefined,
                logisticsChannelId: input.packageContext.logisticsChannelId ?? existing?.logisticsChannelId ?? undefined,
                logisticsChannelName: input.packageContext.logisticsChannelName || existing?.logisticsChannelName || undefined,
                serviceCode: input.packageContext.serviceCode || existing?.serviceCode || undefined,
                shippingDocumentStatus: input.documentStatus || existing?.shippingDocumentStatus || undefined,
                shippingDocumentType: input.shippingDocumentType,
                documentUrl,
                downloadRef: input.downloadRef,
                logisticsProfile: input.packageContext.logisticsProfile || existing?.logisticsProfile || undefined,
                parcelItemCount: input.packageContext.parcelItemCount || existing?.parcelItemCount || 0,
                latestPackageUpdateTime: input.packageContext.latestPackageUpdateTime
                    ? new Date(input.packageContext.latestPackageUpdateTime)
                    : existing?.latestPackageUpdateTime || undefined,
                lastDocumentSyncTime: now,
                rawFragment: nextRawFragment,
                sourceRaw: input.packageContext.package ||
                    existing?.sourceRaw,
                lastSyncTime: now,
            },
        });
        await this.patchOrderRawPackage(input.packageContext, {
            shipping_document_status: input.documentStatus,
            shipping_document_type: input.shippingDocumentType,
            document_url: documentUrl,
            last_document_sync_time: now.toISOString(),
        });
    }
    buildShippingDocumentDownloadUrl(packageNumber, shippingDocumentType) {
        const query = new URLSearchParams({
            packageNumber,
            ...(shippingDocumentType ? { shippingDocumentType } : {}),
        });
        return `/api/shopee/orders/shipping-document/download?${query.toString()}`;
    }
    async patchOrderRawPackage(packageContext, patch) {
        const orderRow = await this.prisma.erpOrder.findUnique({
            where: { orderNo: packageContext.orderNo },
            select: { rawJson: true },
        });
        if (!orderRow || typeof orderRow.rawJson !== 'object' || Array.isArray(orderRow.rawJson)) {
            return;
        }
        const raw = { ...orderRow.rawJson };
        raw.package_list = this.extractArray(raw, ['package_list']).map((item) => {
            const pkg = { ...item };
            if (this.pickString(pkg, ['package_number', 'packageNumber']) !== packageContext.packageNumber) {
                return pkg;
            }
            return {
                ...pkg,
                ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined && value !== null)),
            };
        });
        await this.prisma.erpOrder.update({
            where: { orderNo: packageContext.orderNo },
            data: {
                rawJson: raw,
            },
        });
    }
    buildAuthorizationFailureRedirect(input) {
        const params = {
            status: 'error',
            message: input.message,
        };
        if (input.shopId) {
            params.shopId = input.shopId;
        }
        return this.runtimeConfigService.buildFrontendCallbackUrl(params);
    }
    async handleAuthorizationCallback(params) {
        const { code, shopId } = params;
        if (!code || !shopId) {
            throw new common_1.NotFoundException('Missing required query params: code/shop_id');
        }
        const sdk = await this.createSdk(shopId);
        const tokenPayload = await this.exchangeCodeForToken(sdk, code, shopId);
        const shopInfo = await this.loadShopInfo(sdk, shopId);
        const shopRecord = await this.persistAuthorizedShop({
            shopId,
            shopInfo,
            tokenPayload,
        });
        const productsSynced = await this.syncInitialProducts(sdk, shopRecord.shopId);
        const ordersSynced = await this.syncInitialOrders(sdk, shopRecord.shopId);
        this.logger.log(`Shop ${shopId} authorized. Seed sync completed with ${productsSynced} products and ${ordersSynced} orders.`);
        return {
            redirectUrl: this.buildFrontendRedirectUrl({
                status: 'authorized',
                shopId,
            }),
        };
    }
    async createSdk(shopId, tokenStorage) {
        const sdkModule = await this.loadShopeeSdkModule();
        const ShopeeSDK = sdkModule.ShopeeSDK || sdkModule.default;
        if (!ShopeeSDK) {
            throw new common_1.InternalServerErrorException('Shopee SDK module loaded, but no ShopeeSDK export was found.');
        }
        const partnerId = Number(this.runtimeConfigService.getShopeePartnerId().trim());
        const partnerKey = this.runtimeConfigService.getShopeePartnerKey().trim();
        const region = this.getRegion();
        const baseUrl = this.getShopeeBaseUrl();
        return new ShopeeSDK({
            partner_id: partnerId,
            partner_key: partnerKey,
            region,
            base_url: baseUrl,
            ...(shopId ? { shop_id: Number(shopId) } : {}),
        }, tokenStorage);
    }
    buildAuthorizationSignatureDebug(redirectUrl) {
        const partnerId = this.runtimeConfigService.getShopeePartnerId().trim();
        const partnerKey = this.runtimeConfigService.getShopeePartnerKey().trim();
        const authPath = this.authPartnerPath;
        const timestamp = Math.floor(Date.now() / 1000);
        const baseString = `${partnerId}${authPath}${timestamp}`;
        const sign = (0, node_crypto_1.createHmac)('sha256', partnerKey).update(baseString).digest('hex');
        const partnerKeySha256Prefix = (0, node_crypto_1.createHash)('sha256')
            .update(partnerKey)
            .digest('hex')
            .slice(0, 12);
        const baseUrl = this.getShopeeBaseUrl();
        const query = new URLSearchParams({
            partner_id: partnerId,
            timestamp: timestamp.toString(),
            redirect: redirectUrl,
            sign,
        });
        return {
            partnerId,
            authPath,
            timestamp,
            redirect: redirectUrl,
            baseString,
            sign,
            partnerKeyLength: partnerKey.length,
            partnerKeySha256Prefix,
            url: `${baseUrl}/shop/auth_partner?${query.toString()}`,
        };
    }
    async loadShopeeSdkModule() {
        const dynamicImport = new Function('specifier', 'return import(specifier);');
        try {
            return await dynamicImport('@congminh1254/shopee-sdk');
        }
        catch {
        }
        const candidates = [
            (0, node_path_1.resolve)(process.cwd(), 'node_modules', '@congminh1254', 'shopee-sdk', 'lib', 'sdk.js'),
        ];
        for (const candidate of candidates) {
            if ((0, node_fs_1.existsSync)(candidate)) {
                return dynamicImport((0, node_url_1.pathToFileURL)(candidate).href);
            }
        }
        throw new common_1.InternalServerErrorException('Shopee SDK bundle not found. Expected lib/sdk.js under server/erp-api/node_modules/@congminh1254/shopee-sdk.');
    }
    getRegion() {
        const region = (process.env.SHOPEE_REGION || 'TEST_GLOBAL').toUpperCase();
        const regionAliases = {
            BR: 'BRAZIL',
            BRAZIL: 'BRAZIL',
            CN: 'CHINA',
            CHINA: 'CHINA',
            GLOBAL: 'GLOBAL',
            TEST: 'TEST_GLOBAL',
            TEST_GLOBAL: 'TEST_GLOBAL',
            SANDBOX: 'TEST_GLOBAL',
            TEST_CHINA: 'TEST_CHINA',
        };
        const normalizedRegion = regionAliases[region];
        if (!normalizedRegion) {
            throw new common_1.InternalServerErrorException(`Unsupported SHOPEE_REGION "${region}". Use one of: GLOBAL, BRAZIL, CHINA, TEST_GLOBAL, TEST_CHINA.`);
        }
        return normalizedRegion;
    }
    getShopeeBaseUrl() {
        const region = this.getRegion();
        const baseUrls = {
            BRAZIL: 'https://partner.shopeemobile.com/api/v2',
            CHINA: 'https://openplatform.shopee.cn/api/v2',
            GLOBAL: 'https://partner.shopeemobile.com/api/v2',
            TEST_CHINA: 'https://openplatform.test-stable.shopee.cn/api/v2',
            TEST_GLOBAL: 'https://openplatform.sandbox.test-stable.shopee.sg/api/v2',
        };
        const baseUrl = baseUrls[String(region)];
        if (!baseUrl) {
            throw new common_1.InternalServerErrorException(`Unable to resolve Shopee base URL for region "${String(region)}".`);
        }
        return baseUrl;
    }
    async exchangeCodeForToken(sdk, code, shopId) {
        const tokenDebug = this.buildTokenExchangeDebug(code, shopId);
        this.logger.log([
            'Shopee token exchange signature debug',
            `partner_id=${tokenDebug.partnerId}`,
            `auth_path=${tokenDebug.authPath}`,
            `timestamp=${tokenDebug.timestamp}`,
            `shop_id=${tokenDebug.shopId}`,
            `partner_key_length=${tokenDebug.partnerKeyLength}`,
            `partner_key_sha256_prefix=${tokenDebug.partnerKeySha256Prefix}`,
            `sign_base_string=${tokenDebug.baseString}`,
            `sign=${tokenDebug.sign}`,
            `request_url=${tokenDebug.requestUrl}`,
            `request_body=${JSON.stringify(tokenDebug.requestBody)}`,
        ].join(' | '));
        const rawResponse = await fetch(tokenDebug.requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tokenDebug.requestBody),
        });
        const responseText = await rawResponse.text();
        const response = this.parseShopeeJsonResponse(responseText);
        if (!rawResponse.ok || this.pickString(response, ['error'])) {
            throw new common_1.InternalServerErrorException(`API Error: ${rawResponse.status} - ${responseText}`);
        }
        const accessToken = this.pickString(response, [
            'access_token',
            'accessToken',
            'response.access_token',
        ]);
        const refreshToken = this.pickString(response, [
            'refresh_token',
            'refreshToken',
            'response.refresh_token',
        ]);
        const expiresInSeconds = this.pickNumber(response, [
            'expire_in',
            'expires_in',
            'expireIn',
            'expiresIn',
            'response.expire_in',
            'response.expires_in',
        ]);
        const merchantId = this.pickOptionalNumber(response, [
            'merchant_id',
            'merchantId',
            'response.merchant_id',
        ]);
        if (!accessToken || !refreshToken || !expiresInSeconds) {
            throw new common_1.InternalServerErrorException('Shopee token exchange succeeded but returned an unexpected payload.');
        }
        const normalizedToken = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expire_in: expiresInSeconds,
            shop_id: Number(shopId),
            ...(merchantId ? { merchant_id: merchantId } : {}),
        };
        const memoryTokenStorage = this.createMemoryTokenStorage();
        await memoryTokenStorage.store(normalizedToken);
        const sdkWithToken = await this.createSdk(shopId, memoryTokenStorage);
        Object.assign(sdk, sdkWithToken);
        return {
            accessToken,
            refreshToken,
            expireAt: new Date(Date.now() + expiresInSeconds * 1000),
            rawJson: response,
        };
    }
    buildTokenExchangeDebug(code, shopId) {
        const partnerId = this.runtimeConfigService.getShopeePartnerId().trim();
        const partnerKey = this.runtimeConfigService.getShopeePartnerKey().trim();
        const authPath = '/api/v2/auth/token/get';
        const timestamp = Math.floor(Date.now() / 1000);
        const baseString = `${partnerId}${authPath}${timestamp}`;
        const sign = (0, node_crypto_1.createHmac)('sha256', partnerKey).update(baseString).digest('hex');
        const partnerKeySha256Prefix = (0, node_crypto_1.createHash)('sha256')
            .update(partnerKey)
            .digest('hex')
            .slice(0, 12);
        const requestUrl = `${this.getShopeeBaseUrl()}/auth/token/get?${new URLSearchParams({
            partner_id: partnerId,
            timestamp: timestamp.toString(),
            sign,
        }).toString()}`;
        const requestBody = {
            code,
            partner_id: Number(partnerId),
            shop_id: Number(shopId),
        };
        return {
            partnerId,
            authPath,
            timestamp,
            shopId,
            baseString,
            sign,
            partnerKeyLength: partnerKey.length,
            partnerKeySha256Prefix,
            requestUrl,
            requestBody,
        };
    }
    createMemoryTokenStorage() {
        let token = null;
        return {
            async store(nextToken) {
                token = nextToken;
            },
            async get() {
                return token;
            },
            async clear() {
                token = null;
            },
        };
    }
    parseShopeeJsonResponse(responseText) {
        try {
            return JSON.parse(responseText);
        }
        catch {
            throw new common_1.InternalServerErrorException(`Shopee API returned a non-JSON response: ${responseText}`);
        }
    }
    async loadShopInfo(sdk, fallbackShopId) {
        try {
            if (sdk.shop?.getShopInfo) {
                return (await sdk.shop.getShopInfo());
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown shop info error';
            this.logger.warn(`Load shop info fallback for shop ${fallbackShopId}: ${message}`);
        }
        return {
            shop_id: fallbackShopId,
            shop_name: `Shopee BR Shop ${fallbackShopId}`,
            region: 'BR',
        };
    }
    async persistAuthorizedShop(input) {
        const { shopId, shopInfo, tokenPayload } = input;
        const shopName = this.pickString(shopInfo, ['shop_name', 'shopName']) ||
            `Shopee BR Shop ${shopId}`;
        return this.prisma.$transaction(async (tx) => {
            const shop = await tx.channelShop.upsert({
                where: { shopId },
                create: {
                    channel: client_1.ChannelCode.SHOPEE,
                    siteCode: 'BR',
                    shopId,
                    shopName,
                    status: client_1.ShopStatus.AUTHORIZED,
                    rawJson: shopInfo,
                },
                update: {
                    shopName,
                    status: client_1.ShopStatus.AUTHORIZED,
                    rawJson: shopInfo,
                },
            });
            await tx.channelToken.upsert({
                where: { shopId },
                create: {
                    channel: client_1.ChannelCode.SHOPEE,
                    shopId,
                    accessToken: tokenPayload.accessToken,
                    refreshToken: tokenPayload.refreshToken,
                    expireAt: tokenPayload.expireAt,
                    rawJson: tokenPayload.rawJson,
                },
                update: {
                    accessToken: tokenPayload.accessToken,
                    refreshToken: tokenPayload.refreshToken,
                    expireAt: tokenPayload.expireAt,
                    rawJson: tokenPayload.rawJson,
                },
            });
            return shop;
        });
    }
    async refreshAccessTokenIfNeeded(shop) {
        if (!shop.token) {
            return false;
        }
        const refreshThresholdMs = 5 * 60 * 1000;
        const shouldRefresh = shop.token.expireAt.getTime() - Date.now() <= refreshThresholdMs;
        if (!shouldRefresh) {
            return false;
        }
        const sdk = await this.createSdk(shop.shopId, new prisma_token_storage_1.PrismaTokenStorage(this.prisma, shop.shopId));
        try {
            await sdk.refreshToken(Number(shop.shopId));
            this.logger.log(`Access token refreshed for shop ${shop.shopId}.`);
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown refresh error';
            this.logger.warn(`Failed to refresh access token for shop ${shop.shopId}: ${message}`);
            return false;
        }
    }
    async prepareShopSync(shopId) {
        const shop = await this.prisma.channelShop.findUnique({
            where: { shopId },
            include: { token: true },
        });
        if (!shop || !shop.token) {
            throw new common_1.NotFoundException('Shop authorization record not found.');
        }
        const sdk = await this.createSdk(shopId, new prisma_token_storage_1.PrismaTokenStorage(this.prisma, shopId));
        const tokenRefreshed = await this.refreshAccessTokenIfNeeded(shop);
        this.logger.log(`Starting manual sync for shop ${shopId}.`);
        return {
            shop,
            sdk,
            tokenRefreshed,
        };
    }
    async syncInitialProducts(sdk, shopId) {
        const rawResponse = await this.tryLoadProducts(sdk);
        const listRows = this.extractArray(rawResponse, [
            'item',
            'item_list',
            'items',
            'response.item',
            'response.item_list',
            'data.item',
            'data.item_list',
        ]);
        if (listRows.length === 0) {
            return 0;
        }
        const rows = await this.enrichProductRows(sdk, listRows);
        for (const row of rows) {
            const raw = row;
            const platformProductId = this.pickString(raw, ['item_id', 'itemId', 'id']) || (0, node_crypto_1.randomUUID)();
            const title = this.pickString(raw, ['item_name', 'name', 'itemName']) ||
                `Shopee Product ${platformProductId}`;
            const status = this.pickString(raw, ['item_status', 'status']) || 'ACTIVE';
            const stock = Math.max(0, this.pickOptionalNumber(raw, [
                'stock_info_v2.summary_info.total_available_stock',
                'stock_info_v2.summary_info.total_reserved_stock',
                'stock',
                'normal_stock',
                'current_stock',
                'available_stock',
            ]) ?? 0);
            const price = this.pickPriceString(raw);
            await this.prisma.erpProduct.upsert({
                where: {
                    shopId_platformProductId: {
                        shopId,
                        platformProductId,
                    },
                },
                create: {
                    channel: client_1.ChannelCode.SHOPEE,
                    siteCode: 'BR',
                    shopId,
                    platformProductId,
                    title,
                    status,
                    stock,
                    price: new client_1.Prisma.Decimal(price),
                    rawJson: raw,
                },
                update: {
                    title,
                    status,
                    stock,
                    price: new client_1.Prisma.Decimal(price),
                    rawJson: raw,
                },
            });
        }
        return rows.length;
    }
    async enrichProductRows(sdk, rows) {
        if (!sdk.product?.getItemBaseInfo) {
            return rows;
        }
        const itemIds = rows
            .map((row) => this.pickOptionalNumber(row, [
            'item_id',
            'itemId',
            'id',
        ]))
            .filter((itemId) => Number.isFinite(itemId));
        if (itemIds.length === 0) {
            return rows;
        }
        try {
            const response = await sdk.product.getItemBaseInfo({
                item_id_list: itemIds.slice(0, 50),
            });
            const detailRows = this.extractArray(response, [
                'item_list',
                'response.item_list',
                'data.item_list',
            ]);
            if (detailRows.length === 0) {
                return rows;
            }
            const detailByItemId = new Map(detailRows.map((row) => {
                const raw = row;
                const itemId = this.pickString(raw, ['item_id', 'itemId', 'id']) ?? (0, node_crypto_1.randomUUID)();
                return [itemId, raw];
            }));
            const mergedRows = rows.map((row) => {
                const raw = row;
                const itemId = this.pickString(raw, ['item_id', 'itemId', 'id']);
                const detail = itemId ? detailByItemId.get(itemId) : undefined;
                return detail ? { ...raw, ...detail } : raw;
            });
            return await this.enrichProductRowsWithModels(sdk, mergedRows);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown product detail sync error';
            this.logger.warn(`Product base info request failed: ${message}`);
            return rows;
        }
    }
    async enrichProductRowsWithModels(sdk, rows) {
        if (!sdk.product?.getModelList) {
            return rows;
        }
        const enrichedRows = [];
        for (const row of rows) {
            const raw = row;
            const hasModel = this.readNested(raw, 'has_model') === true;
            const itemId = this.pickOptionalNumber(raw, ['item_id', 'itemId', 'id']);
            if (!hasModel || !itemId) {
                enrichedRows.push(raw);
                continue;
            }
            try {
                const response = await sdk.product.getModelList({
                    item_id: itemId,
                });
                const modelRows = this.extractArray(response, [
                    'model',
                    'response.model',
                    'data.model',
                ]);
                if (modelRows.length === 0) {
                    enrichedRows.push(raw);
                    continue;
                }
                const modelPrices = modelRows
                    .map((model) => this.pickOptionalNumber(model, [
                    'price_info',
                    'price_info.current_price',
                    'current_price',
                    'original_price',
                ]))
                    .filter((price) => Number.isFinite(price));
                const totalStock = modelRows.reduce((sum, model) => {
                    const stock = this.pickOptionalNumber(model, [
                        'stock_info_v2.summary_info.total_available_stock',
                        'stock',
                        'current_stock',
                        'available_stock',
                    ]) ?? 0;
                    return sum + Math.max(0, stock);
                }, 0);
                enrichedRows.push({
                    ...raw,
                    model: modelRows,
                    ...(modelPrices.length > 0
                        ? {
                            current_price: Math.min(...modelPrices),
                        }
                        : {}),
                    stock_info_v2: {
                        ...this.readNested(raw, 'stock_info_v2'),
                        summary_info: {
                            ...(this.readNested(raw, 'stock_info_v2.summary_info') ?? {}),
                            total_available_stock: totalStock,
                        },
                    },
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown product model sync error';
                this.logger.warn(`Product model request failed for item ${itemId}: ${message}`);
                enrichedRows.push(raw);
            }
        }
        return enrichedRows;
    }
    async syncInitialOrders(sdk, shopId) {
        const listRows = await this.loadOrdersByTimeWindow(sdk, 15, 50);
        const summaries = await this.syncOrderListRows(sdk, shopId, listRows, {
            triggerType: 'sync_recent',
            requestPayloadSummary: {
                source: 'shop_authorization_seed',
                shopId,
                days: 15,
                limit: 50,
            },
        });
        return summaries.length;
    }
    async resolveOrderTargets(payload) {
        const ids = Array.from(new Set([payload.orderId, ...(payload.orderIds || [])].filter((item) => Boolean(item))));
        const orderNos = Array.from(new Set([payload.orderNo, ...(payload.orderNos || [])].filter((item) => Boolean(item))));
        if (!ids.length && !orderNos.length) {
            return [];
        }
        return this.prisma.erpOrder.findMany({
            where: {
                OR: [
                    ...(ids.length ? [{ id: { in: ids } }] : []),
                    ...(orderNos.length ? [{ orderNo: { in: orderNos } }] : []),
                ],
            },
            select: {
                id: true,
                shopId: true,
                orderNo: true,
            },
        });
    }
    groupTargetsByShop(rows) {
        const groups = new Map();
        for (const row of rows) {
            const current = groups.get(row.shopId) || [];
            current.push(row.orderNo);
            groups.set(row.shopId, Array.from(new Set(current)));
        }
        return groups;
    }
    async syncOrderDetailsForShop(sdk, shopId, orderNos, context) {
        const details = await this.loadOrderDetails(sdk, orderNos);
        if (details.length === 0) {
            return [];
        }
        return this.upsertOrderRows(shopId, details, context);
    }
    async syncOrderListRows(sdk, shopId, rows, context) {
        if (!rows.length) {
            return [];
        }
        const orderNos = rows
            .map((row) => this.pickString(row, ['order_sn', 'orderSn', 'id']))
            .filter((orderNo) => Boolean(orderNo));
        if (orderNos.length === 0) {
            return [];
        }
        const details = await this.loadOrderDetails(sdk, orderNos);
        const mergedRows = details.length > 0
            ? rows.map((row) => {
                const raw = row;
                const orderNo = this.pickString(raw, ['order_sn', 'orderSn', 'id']);
                const detail = details.find((item) => this.pickString(item, ['order_sn', 'orderSn', 'id']) ===
                    orderNo);
                return detail ? { ...raw, ...detail } : raw;
            })
            : rows;
        return this.upsertOrderRows(shopId, mergedRows, context);
    }
    async loadOrderDetails(sdk, orderNos) {
        if (!sdk.order?.getOrdersDetail || orderNos.length === 0) {
            return [];
        }
        const detailRows = [];
        for (const chunk of this.chunkStrings(orderNos, 50)) {
            try {
                const response = await sdk.order.getOrdersDetail({
                    order_sn_list: chunk,
                    response_optional_fields: FULL_ORDER_DETAIL_FIELDS,
                    request_order_status_pending: true,
                });
                const rows = this.extractArray(response, [
                    'order_list',
                    'orders',
                    'response.order_list',
                    'data.order_list',
                ]);
                if (rows.length > 0) {
                    const enrichedRows = await this.enrichOrderDetailsWithPackageData(sdk, rows);
                    detailRows.push(...enrichedRows);
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown Shopee order detail sync error';
                this.logger.warn(`Order detail request failed for [${chunk.join(', ')}]: ${message}`);
            }
        }
        return detailRows;
    }
    async enrichOrderDetailsWithPackageData(sdk, rows) {
        if (!sdk.order?.getPackageDetail) {
            return rows.map((row) => this.decorateSyncMeta(row, {
                triggerType: 'sync_recent',
                resultStatus: 'success',
            }));
        }
        const packageNumbers = rows
            .flatMap((row) => this.extractArray(row, ['package_list']).map((item) => this.pickString(item, ['package_number', 'packageNumber'])))
            .filter((item) => Boolean(item));
        if (packageNumbers.length === 0) {
            return rows.map((row) => this.decorateSyncMeta(row, {
                triggerType: 'sync_recent',
                resultStatus: 'success',
            }));
        }
        const packageDetailByNumber = new Map();
        for (const chunk of this.chunkStrings(packageNumbers, 50)) {
            try {
                const response = await sdk.order.getPackageDetail({
                    package_number_list: chunk,
                });
                const packageRows = this.extractArray(response, [
                    'package_list',
                    'response.package_list',
                    'data.package_list',
                ]);
                for (const packageRow of packageRows) {
                    const packageNumber = this.pickString(packageRow, ['package_number', 'packageNumber']);
                    if (packageNumber) {
                        packageDetailByNumber.set(packageNumber, packageRow);
                    }
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown Shopee package detail sync error';
                this.logger.warn(`Package detail request failed for [${chunk.join(', ')}]: ${message}`);
            }
        }
        return rows.map((row) => {
            const packageList = this.extractArray(row, ['package_list']).map((item) => {
                const basePackage = item;
                const packageNumber = this.pickString(basePackage, ['package_number', 'packageNumber']);
                const packageDetail = packageNumber
                    ? packageDetailByNumber.get(packageNumber)
                    : undefined;
                const mergedPackage = packageDetail
                    ? {
                        ...basePackage,
                        ...packageDetail,
                        _source: 'REALTIME_SYNCED',
                        _real_fields: [
                            'package_number',
                            'tracking_number',
                            'fulfillment_status',
                            'logistics_status',
                            'shipping_carrier',
                            'logistics_channel_id',
                            'update_time',
                            'ship_by_date',
                            'item_list',
                            'recipient_address',
                            'parcel_chargeable_weight_gram',
                        ],
                    }
                    : {
                        ...basePackage,
                        _source: 'DB_RAW_JSON',
                        _real_fields: [
                            'package_number',
                            'fulfillment_status',
                            'logistics_status',
                            'logistics_channel_id',
                        ],
                    };
                return mergedPackage;
            });
            const firstPackage = packageList[0];
            const trackingNumber = this.pickString(firstPackage || {}, ['tracking_number', 'trackingNumber']) ||
                this.pickString(row, ['tracking_number', 'trackingNumber']);
            return this.decorateSyncMeta({
                ...row,
                ...(trackingNumber ? { tracking_number: trackingNumber } : {}),
                package_list: packageList,
            }, {
                triggerType: 'sync_recent',
                resultStatus: 'success',
            });
        });
    }
    decorateSyncMeta(raw, context) {
        const packageList = this.extractArray(raw, ['package_list']);
        const hasPaymentInfoField = this.hasAnyPath(raw, [
            'payment_info',
            'paymentInfo',
            'payment_info_list',
            'paymentInfoList',
        ]);
        const hasInvoiceField = this.hasAnyPath(raw, [
            'invoice_data',
            'invoiceInfo',
            'invoice_data_info',
        ]);
        const hasAddressField = this.hasAnyPath(raw, ['recipient_address', 'recipientAddress']);
        const fallbackFields = this.getFallbackOrderFields(raw);
        return {
            ...raw,
            _sync_meta: {
                last_sync_time: new Date().toISOString(),
                last_trigger_type: context.triggerType,
                last_result: context.resultStatus,
                ...(context.message ? { last_message: context.message } : {}),
                detail_source: 'REALTIME_SYNCED',
                package_source: packageList.length > 0 ? 'REALTIME_SYNCED' : 'FALLBACK',
                payment_source: hasPaymentInfoField ? 'REALTIME_SYNCED' : 'FALLBACK',
                invoice_source: hasInvoiceField ? 'REALTIME_SYNCED' : 'FALLBACK',
                address_source: hasAddressField ? 'REALTIME_SYNCED' : 'FALLBACK',
                status_source: this.hasAnyPath(raw, ['order_status', 'status'])
                    ? 'REALTIME_SYNCED'
                    : 'FALLBACK',
                fallback_fields: fallbackFields,
            },
        };
    }
    getFallbackOrderFields(raw) {
        const checks = [
            ['package_list', this.extractArray(raw, ['package_list']).length > 0],
            [
                'tracking_number',
                this.hasAnyPath(raw, ['tracking_number']) ||
                    this.packageFieldExists(raw, 'tracking_number'),
            ],
            [
                'package_status',
                this.packageFieldExists(raw, 'package_status') ||
                    this.packageFieldExists(raw, 'fulfillment_status'),
            ],
            [
                'logistics_status',
                this.hasAnyPath(raw, ['logistics_status']) ||
                    this.packageFieldExists(raw, 'logistics_status'),
            ],
            ['logistics_channel_id', this.packageFieldExists(raw, 'logistics_channel_id')],
            ['service_code', this.packageFieldExists(raw, 'service_code')],
            ['shipping_document_status', this.packageFieldExists(raw, 'shipping_document_status')],
            ['shipping_document_type', this.packageFieldExists(raw, 'shipping_document_type')],
            ['recipient_address', this.hasAnyPath(raw, ['recipient_address', 'recipientAddress'])],
            [
                'payment_info',
                this.hasAnyPath(raw, [
                    'payment_info',
                    'paymentInfo',
                    'payment_info_list',
                    'paymentInfoList',
                ]),
            ],
            ['invoice_data', this.hasAnyPath(raw, ['invoice_data', 'invoiceInfo', 'invoice_data_info'])],
            ['buyer_user_id', this.hasAnyPath(raw, ['buyer_user_id', 'buyerUserId'])],
            ['message_to_seller', this.hasAnyPath(raw, ['message_to_seller', 'messageToSeller'])],
            ['cancel_reason', this.hasAnyPath(raw, ['cancel_reason', 'cancelReason'])],
            ['shipping_carrier', this.hasAnyPath(raw, ['shipping_carrier', 'shippingCarrier'])],
            ['payment_method', this.hasAnyPath(raw, ['payment_method', 'paymentMethod'])],
            ['ship_by_date', this.hasAnyPath(raw, ['ship_by_date', 'shipByDate'])],
            ['days_to_ship', this.hasAnyPath(raw, ['days_to_ship', 'daysToShip'])],
        ];
        return checks.filter(([, ok]) => !ok).map(([field]) => field);
    }
    async upsertOrderRows(shopId, rows, context) {
        const summaries = [];
        for (const row of rows) {
            const normalizedRow = this.normalizeOrderStatusRecord(row);
            const raw = this.decorateSyncMeta(normalizedRow, {
                triggerType: context.triggerType,
                resultStatus: 'success',
            });
            const orderNo = this.pickString(raw, ['order_sn', 'orderSn', 'id']) || (0, node_crypto_1.randomUUID)();
            const buyerName = this.pickString(raw, [
                'buyer_username',
                'buyer_user_name',
                'buyerName',
                'recipient_name',
            ]);
            const orderStatus = this.normalizeShopeeOrderStatus(this.pickString(raw, ['order_status', 'orderStatus', 'status'])) || 'UNSPECIFIED';
            const totalAmount = this.pickPriceString(raw, [
                'total_amount',
                'totalAmount',
                'pay_amount',
                'estimated_shipping_fee',
            ]);
            const createdAtRemoteUnix = this.pickOptionalNumber(raw, [
                'create_time',
                'createTime',
            ]);
            const region = this.pickString(raw, ['region']) || 'BR';
            const currency = this.pickString(raw, ['currency']) || 'BRL';
            const existing = await this.prisma.erpOrder.findUnique({
                where: { orderNo },
                select: {
                    rawJson: true,
                    orderStatus: true,
                },
            });
            const existingRaw = existing?.rawJson && typeof existing.rawJson === 'object' && !Array.isArray(existing.rawJson)
                ? existing.rawJson
                : undefined;
            const changedFields = this.computeChangedFields(existingRaw, raw);
            const persistedOrder = await this.prisma.erpOrder.upsert({
                where: {
                    orderNo,
                },
                create: {
                    channel: client_1.ChannelCode.SHOPEE,
                    siteCode: region,
                    shopId,
                    orderNo,
                    orderStatus,
                    buyerName,
                    currency,
                    totalAmount: new client_1.Prisma.Decimal(totalAmount),
                    createdAtRemote: createdAtRemoteUnix
                        ? new Date(createdAtRemoteUnix * 1000)
                        : null,
                    rawJson: raw,
                },
                update: {
                    orderStatus,
                    buyerName,
                    currency,
                    totalAmount: new client_1.Prisma.Decimal(totalAmount),
                    createdAtRemote: createdAtRemoteUnix
                        ? new Date(createdAtRemoteUnix * 1000)
                        : null,
                    rawJson: raw,
                },
            });
            await this.upsertPackageMasterRows({
                shopId,
                siteCode: region,
                orderId: persistedOrder.id,
                orderNo,
                orderSn: this.pickString(raw, ['order_sn', 'orderSn']) || orderNo,
                raw,
            });
            const packageList = this.extractArray(raw, ['package_list']);
            const syncMeta = this.readNested(raw, '_sync_meta');
            summaries.push({
                shopId,
                orderNo,
                orderSn: this.pickString(raw, ['order_sn', 'orderSn']) || orderNo,
                orderStatus,
                packageNumber: this.pickString(packageList[0], [
                    'package_number',
                    'packageNumber',
                ]),
                changedFields,
                detailSource: this.pickString(syncMeta || {}, ['detail_source']) || 'REALTIME_SYNCED',
                packageSource: this.pickString(syncMeta || {}, ['package_source']) || 'FALLBACK',
                resultStatus: changedFields.length > 0 ? 'success' : 'partial',
                message: changedFields.length > 0
                    ? `Updated fields: ${changedFields.join(', ')}`
                    : 'No tracked fields changed; sync meta refreshed.',
            });
        }
        return summaries;
    }
    async upsertPackageMasterRows(input) {
        const packageList = this.extractArray(input.raw, ['package_list', 'packageList']);
        if (packageList.length === 0) {
            return [];
        }
        const now = new Date();
        const existingRows = await this.prisma.erpOrderPackage.findMany({
            where: {
                packageNumber: {
                    in: packageList
                        .map((item) => this.pickString(item, ['package_number', 'packageNumber']))
                        .filter((item) => Boolean(item)),
                },
            },
        });
        const existingByPackageNumber = new Map(existingRows.map((row) => [row.packageNumber, row]));
        for (const item of packageList) {
            const pkg = item;
            const packageNumber = this.pickString(pkg, ['package_number', 'packageNumber']) || `${input.orderNo}-PKG1`;
            const existing = existingByPackageNumber.get(packageNumber);
            const shippingDocumentType = this.pickString(pkg, [
                'shipping_document_type',
                'shippingDocumentType',
            ]);
            const shippingDocumentStatus = this.pickString(pkg, [
                'shipping_document_status',
                'shippingDocumentStatus',
            ]);
            const documentUrl = this.pickString(pkg, ['document_url', 'documentUrl']) ||
                (shippingDocumentType
                    ? this.buildShippingDocumentDownloadUrl(packageNumber, shippingDocumentType)
                    : existing?.documentUrl || undefined);
            const latestPackageUpdateTime = this.pickDate(pkg, [
                'update_time',
                'latestPackageUpdateTime',
                'updateTime',
            ]) || now;
            const lastDocumentSyncTime = this.pickDate(pkg, ['last_document_sync_time', 'lastDocumentSyncTime']) ||
                (shippingDocumentStatus ? now : existing?.lastDocumentSyncTime || undefined);
            await this.prisma.erpOrderPackage.upsert({
                where: {
                    packageNumber,
                },
                create: {
                    channel: client_1.ChannelCode.SHOPEE,
                    siteCode: input.siteCode || 'BR',
                    shopId: input.shopId,
                    orderId: input.orderId,
                    orderNo: input.orderNo,
                    orderSn: input.orderSn,
                    packageNumber,
                    trackingNumber: this.pickString(pkg, ['tracking_number', 'trackingNumber']) ||
                        this.pickString(input.raw, ['tracking_number', 'trackingNumber']),
                    packageStatus: this.pickString(pkg, ['package_status', 'packageStatus']),
                    packageFulfillmentStatus: this.pickString(pkg, [
                        'fulfillment_status',
                        'packageFulfillmentStatus',
                        'fulfillmentStatus',
                    ]),
                    logisticsStatus: this.pickString(pkg, ['logistics_status', 'logisticsStatus']),
                    shippingCarrier: this.pickString(pkg, ['shipping_carrier', 'shippingCarrier']) ||
                        this.pickString(input.raw, ['shipping_carrier', 'shippingCarrier']),
                    logisticsChannelId: this.pickNumber(pkg, [
                        'logistics_channel_id',
                        'logisticsChannelId',
                    ]),
                    logisticsChannelName: this.pickString(pkg, [
                        'logistics_channel_name',
                        'logisticsChannelName',
                        'channel_name',
                    ]),
                    serviceCode: this.pickString(pkg, ['service_code', 'serviceCode']),
                    shippingDocumentStatus,
                    shippingDocumentType,
                    documentUrl,
                    downloadRef: this.readNested(pkg, 'download_ref') ||
                        existing?.downloadRef ||
                        undefined,
                    logisticsProfile: this.deriveLogisticsProfile({
                        shippingCarrier: this.pickString(pkg, ['shipping_carrier', 'shippingCarrier']) ||
                            this.pickString(input.raw, ['shipping_carrier', 'shippingCarrier']),
                        logisticsChannelId: this.pickNumber(pkg, [
                            'logistics_channel_id',
                            'logisticsChannelId',
                        ]),
                    }),
                    parcelItemCount: this.pickNumber(pkg, ['parcel_item_count', 'parcelItemCount', 'item_count', 'itemCount']) ||
                        0,
                    latestPackageUpdateTime,
                    lastDocumentSyncTime,
                    rawFragment: pkg,
                    sourceRaw: input.raw,
                    lastSyncTime: this.pickDate(input.raw, ['_sync_meta.last_sync_time', 'update_time', 'updateTime']) || now,
                },
                update: {
                    siteCode: input.siteCode || existing?.siteCode || 'BR',
                    shopId: input.shopId,
                    orderId: input.orderId,
                    orderNo: input.orderNo,
                    orderSn: input.orderSn,
                    trackingNumber: this.pickString(pkg, ['tracking_number', 'trackingNumber']) ||
                        this.pickString(input.raw, ['tracking_number', 'trackingNumber']) ||
                        existing?.trackingNumber ||
                        undefined,
                    packageStatus: this.pickString(pkg, ['package_status', 'packageStatus']) ||
                        existing?.packageStatus ||
                        undefined,
                    packageFulfillmentStatus: this.pickString(pkg, ['fulfillment_status', 'packageFulfillmentStatus', 'fulfillmentStatus']) ||
                        existing?.packageFulfillmentStatus ||
                        undefined,
                    logisticsStatus: this.pickString(pkg, ['logistics_status', 'logisticsStatus']) ||
                        existing?.logisticsStatus ||
                        undefined,
                    shippingCarrier: this.pickString(pkg, ['shipping_carrier', 'shippingCarrier']) ||
                        this.pickString(input.raw, ['shipping_carrier', 'shippingCarrier']) ||
                        existing?.shippingCarrier ||
                        undefined,
                    logisticsChannelId: this.pickNumber(pkg, ['logistics_channel_id', 'logisticsChannelId']) ??
                        existing?.logisticsChannelId ??
                        undefined,
                    logisticsChannelName: this.pickString(pkg, ['logistics_channel_name', 'logisticsChannelName', 'channel_name']) ||
                        existing?.logisticsChannelName ||
                        undefined,
                    serviceCode: this.pickString(pkg, ['service_code', 'serviceCode']) || existing?.serviceCode || undefined,
                    shippingDocumentStatus: shippingDocumentStatus || existing?.shippingDocumentStatus || undefined,
                    shippingDocumentType: shippingDocumentType || existing?.shippingDocumentType || undefined,
                    documentUrl,
                    downloadRef: this.readNested(pkg, 'download_ref') ||
                        existing?.downloadRef,
                    logisticsProfile: this.deriveLogisticsProfile({
                        shippingCarrier: this.pickString(pkg, ['shipping_carrier', 'shippingCarrier']) ||
                            this.pickString(input.raw, ['shipping_carrier', 'shippingCarrier']) ||
                            existing?.shippingCarrier ||
                            undefined,
                        logisticsChannelId: this.pickNumber(pkg, ['logistics_channel_id', 'logisticsChannelId']) ??
                            existing?.logisticsChannelId ??
                            undefined,
                    }) || existing?.logisticsProfile || undefined,
                    parcelItemCount: this.pickNumber(pkg, ['parcel_item_count', 'parcelItemCount', 'item_count', 'itemCount']) ||
                        existing?.parcelItemCount ||
                        0,
                    latestPackageUpdateTime,
                    lastDocumentSyncTime,
                    rawFragment: pkg,
                    sourceRaw: input.raw,
                    lastSyncTime: this.pickDate(input.raw, ['_sync_meta.last_sync_time', 'update_time', 'updateTime']) || now,
                },
            });
        }
        return packageList.length;
    }
    async loadOrdersByTimeWindow(sdk, days, limit) {
        try {
            if (!sdk.order?.getOrderList) {
                return [];
            }
            const timeTo = Math.floor(Date.now() / 1000);
            const timeFrom = timeTo - days * 24 * 60 * 60;
            const response = await sdk.order.getOrderList({
                time_range_field: 'create_time',
                time_from: timeFrom,
                time_to: timeTo,
                page_size: Math.min(limit, 50),
                response_optional_fields: 'order_status',
                request_order_status_pending: true,
            });
            return this.extractArray(response, [
                'order_list',
                'orders',
                'response.order_list',
                'data.order_list',
            ]);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown order sync error';
            this.logger.warn(`Order sync request failed: ${message}`);
            return [];
        }
    }
    buildSyncPayloadSummary(payload) {
        return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
            if (value === undefined || value === null || value === '') {
                return false;
            }
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            return true;
        }));
    }
    async writeSyncLogs(entries) {
        if (entries.length === 0) {
            return 0;
        }
        for (const entry of entries) {
            await this.prisma.shopeeOrderSyncLog.create({
                data: {
                    triggerType: entry.triggerType,
                    shopId: entry.shopId,
                    orderNo: entry.orderNo,
                    orderSn: entry.orderSn,
                    packageNumber: entry.packageNumber,
                    requestPayloadSummary: (entry.requestPayloadSummary || {}),
                    resultStatus: entry.resultStatus,
                    changedFields: (entry.changedFields || []),
                    detailSource: entry.detailSource,
                    packageSource: entry.packageSource,
                    message: entry.message,
                },
            });
        }
        return entries.length;
    }
    validateWebhookSignature(payload) {
        const candidateHeader = this.pickHeaderValue(payload.headers, [
            'authorization',
            'x-shopee-hmac-sha256',
            'x-shopee-signature',
            'x-signature',
        ]);
        if (!candidateHeader) {
            return {
                checked: false,
                passed: true,
                mode: 'best_effort',
                message: 'No webhook signature header found; accepted in best-effort mode.',
            };
        }
        if (!payload.rawBody) {
            return {
                checked: true,
                passed: false,
                mode: 'signature',
                message: 'Webhook signature header exists but raw body is unavailable.',
            };
        }
        const secret = this.runtimeConfigService.getShopeePartnerKey().trim();
        const normalizedHeader = candidateHeader.replace(/^sha256=/i, '').trim();
        const computed = (0, node_crypto_1.createHmac)('sha256', secret).update(payload.rawBody).digest('hex');
        return {
            checked: true,
            passed: normalizedHeader === computed,
            mode: 'signature',
            message: normalizedHeader === computed
                ? 'Webhook signature validated.'
                : 'Webhook signature mismatch.',
        };
    }
    async extractWebhookDispatchContext(query, body) {
        const shopId = this.pickString(body, ['shop_id', 'shopId', 'data.shop_id', 'data.shopId']) ||
            this.pickString(query, ['shop_id', 'shopId']);
        const webhookOrderNos = Array.from(new Set([
            this.pickString(body, ['order_sn', 'orderSn', 'data.order_sn', 'data.orderSn']),
            ...this.extractArray(body, [
                'order_sn_list',
                'orderSnList',
                'orders',
                'data.order_sn_list',
                'data.orderSnList',
            ])
                .map((item) => typeof item === 'string'
                ? item
                : this.pickString(item, [
                    'order_sn',
                    'orderSn',
                    'id',
                ]))
                .filter((item) => Boolean(item)),
        ].filter((item) => Boolean(item))));
        const packageNumbers = Array.from(new Set([
            this.pickString(body, [
                'package_number',
                'packageNumber',
                'data.package_number',
                'data.packageNumber',
            ]),
            ...this.extractArray(body, ['package_list', 'data.package_list'])
                .map((item) => this.pickString(item, [
                'package_number',
                'packageNumber',
            ]))
                .filter((item) => Boolean(item)),
        ].filter((item) => Boolean(item))));
        const packageContext = packageNumbers.length > 0
            ? await this.findOrderByPackageNumber(packageNumbers[0])
            : null;
        const orderNos = Array.from(new Set([
            ...webhookOrderNos,
            packageContext?.orderNo,
            packageContext?.orderSn,
        ].filter((item) => Boolean(item))));
        const eventType = this.resolveWebhookEventType(query, body, orderNos, packageNumbers);
        return {
            eventType,
            shopId: shopId || packageContext?.shopId,
            orderNos,
            packageNumbers,
            packageContext,
            requestPayloadSummary: {
                query,
                body: this.buildWebhookBodySummary(body),
                shopId: shopId || packageContext?.shopId,
                orderNos,
                packageNumbers,
                eventType,
                packageLookupHit: Boolean(packageContext),
            },
        };
    }
    resolveWebhookEventType(query, body, orderNos, packageNumbers) {
        const rawEvent = this.pickString(body, [
            'code',
            'type',
            'topic',
            'event',
            'action',
            'event_type',
            'eventType',
            'data.code',
            'data.type',
        ]) ||
            this.pickString(query, ['code', 'type', 'topic', 'event']);
        const normalized = String(rawEvent || '').toUpperCase();
        if (normalized.includes('SHIPPING_DOCUMENT') ||
            normalized.includes('DOCUMENT_STATUS')) {
            return 'SHIPPING_DOCUMENT_STATUS_PUSH';
        }
        if (normalized.includes('CANCEL') ||
            normalized.includes('RETURN') ||
            normalized.includes('REFUND')) {
            return 'CANCEL_OR_RETURN_UPDATE';
        }
        if (normalized.includes('TRACK') ||
            normalized.includes('LOGISTIC') ||
            normalized.includes('PACKAGE') ||
            packageNumbers.length > 0) {
            return 'PACKAGE_LOGISTICS_UPDATE';
        }
        if (normalized.includes('ORDER') || orderNos.length > 0) {
            return 'ORDER_STATUS_UPDATE';
        }
        return rawEvent || 'UNKNOWN_WEBHOOK_EVENT';
    }
    buildWebhookBodySummary(body) {
        return {
            code: this.pickString(body, ['code', 'event', 'topic', 'type']),
            orderSn: this.pickString(body, ['order_sn', 'orderSn', 'data.order_sn']),
            orderStatus: this.normalizeShopeeOrderStatus(this.pickString(body, [
                'order_status',
                'orderStatus',
                'data.order_status',
            ])),
            packageNumber: this.pickString(body, [
                'package_number',
                'packageNumber',
                'data.package_number',
            ]),
            trackingNumber: this.pickString(body, [
                'tracking_number',
                'trackingNumber',
                'data.tracking_number',
            ]),
            logisticsStatus: this.pickString(body, [
                'logistics_status',
                'logisticsStatus',
                'data.logistics_status',
            ]),
            shippingCarrier: this.pickString(body, [
                'shipping_carrier',
                'shippingCarrier',
                'data.shipping_carrier',
            ]),
            logisticsChannelId: this.pickString(body, [
                'logistics_channel_id',
                'logisticsChannelId',
                'data.logistics_channel_id',
            ]),
            logisticsChannelName: this.pickString(body, [
                'logistics_channel_name',
                'logisticsChannelName',
                'data.logistics_channel_name',
            ]),
            serviceCode: this.pickString(body, [
                'service_code',
                'serviceCode',
                'data.service_code',
            ]),
            shippingDocumentStatus: this.pickString(body, [
                'shipping_document_status',
                'shippingDocumentStatus',
                'data.shipping_document_status',
            ]),
            shippingDocumentType: this.pickString(body, [
                'shipping_document_type',
                'shippingDocumentType',
                'data.shipping_document_type',
            ]),
            cancelReason: this.pickString(body, [
                'cancel_reason',
                'cancelReason',
                'data.cancel_reason',
            ]),
            shopId: this.pickString(body, ['shop_id', 'shopId', 'data.shop_id']),
        };
    }
    computeChangedFields(previous, next) {
        if (!previous) {
            return [
                'order_status',
                'package_list',
                'tracking_number',
                'logistics_status',
                'logistics_channel_id',
                'service_code',
                'shipping_document_status',
                'shipping_document_type',
                'document_url',
                'payment_info',
                'invoice_data',
                'recipient_address',
            ];
        }
        const trackedFields = [
            'order_status',
            'tracking_number',
            'shipping_carrier',
            'service_code',
            'shipping_document_status',
            'shipping_document_type',
            'document_url',
            'package_list',
            'recipient_address',
            'cancel_reason',
            'payment_info',
            'invoice_data',
            'ship_by_date',
            'days_to_ship',
            'message_to_seller',
            '_sync_meta.last_trigger_type',
            '_sync_meta.last_result',
            '_sync_meta.last_sync_time',
        ];
        return trackedFields.filter((field) => {
            const before = this.stringifyComparable(this.readNested(previous, field));
            const after = this.stringifyComparable(this.readNested(next, field));
            return before !== after;
        });
    }
    async findOrderByPackageNumber(packageNumber) {
        const packageRow = await this.prisma.erpOrderPackage.findUnique({
            where: {
                packageNumber,
            },
        });
        if (packageRow) {
            return {
                id: packageRow.orderId || packageRow.id,
                shopId: packageRow.shopId,
                orderId: packageRow.orderId,
                orderNo: packageRow.orderNo,
                orderSn: packageRow.orderSn,
                orderStatus: packageRow.packageStatus || undefined,
                siteCode: packageRow.siteCode,
                updatedAt: packageRow.updatedAt.toISOString(),
                packageNumber: packageRow.packageNumber,
                trackingNumber: packageRow.trackingNumber || undefined,
                shippingCarrier: packageRow.shippingCarrier || undefined,
                logisticsStatus: packageRow.logisticsStatus || undefined,
                logisticsChannelId: packageRow.logisticsChannelId || undefined,
                logisticsChannelName: packageRow.logisticsChannelName || undefined,
                serviceCode: packageRow.serviceCode || undefined,
                shippingDocumentStatus: packageRow.shippingDocumentStatus || undefined,
                shippingDocumentType: packageRow.shippingDocumentType || undefined,
                documentUrl: packageRow.documentUrl || undefined,
                downloadRef: packageRow.downloadRef,
                logisticsProfile: packageRow.logisticsProfile || undefined,
                parcelItemCount: packageRow.parcelItemCount,
                latestPackageUpdateTime: packageRow.latestPackageUpdateTime?.toISOString(),
                lastDocumentSyncTime: packageRow.lastDocumentSyncTime?.toISOString(),
                package: packageRow.rawFragment && typeof packageRow.rawFragment === 'object' && !Array.isArray(packageRow.rawFragment)
                    ? packageRow.rawFragment
                    : null,
            };
        }
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT
          id,
          shop_id AS "shopId",
          order_no AS "orderNo",
          order_status AS "orderStatus",
          site_code AS "siteCode",
          raw_json AS "rawJson",
          updated_at AS "updatedAt"
        FROM erp_order eo
        WHERE
          COALESCE(eo.raw_json::jsonb ->> 'package_number', '') = ${packageNumber}
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(eo.raw_json::jsonb -> 'package_list') = 'array'
                  THEN eo.raw_json::jsonb -> 'package_list'
                ELSE '[]'::jsonb
              END
            ) pkg
            WHERE COALESCE(pkg ->> 'package_number', pkg ->> 'packageNumber') = ${packageNumber}
          )
        ORDER BY updated_at DESC
        LIMIT 1
      `);
        const row = rows[0];
        if (!row) {
            return null;
        }
        const raw = row.rawJson && typeof row.rawJson === 'object' && !Array.isArray(row.rawJson)
            ? row.rawJson
            : {};
        const packageList = this.extractArray(raw, ['package_list', 'packageList']);
        const matchedPackage = packageList.find((item) => {
            const pkg = item;
            return (this.pickString(pkg, ['package_number', 'packageNumber']) === packageNumber);
        }) ||
            packageList[0];
        return {
            id: row.id,
            shopId: row.shopId,
            orderNo: row.orderNo,
            orderSn: this.pickString(raw, ['order_sn', 'orderSn']) || row.orderNo,
            orderStatus: row.orderStatus,
            siteCode: row.siteCode,
            updatedAt: row.updatedAt.toISOString(),
            packageNumber,
            trackingNumber: this.pickString(matchedPackage || {}, [
                'tracking_number',
                'trackingNumber',
            ]),
            shippingCarrier: this.pickString(matchedPackage || {}, [
                'shipping_carrier',
                'shippingCarrier',
            ]),
            logisticsStatus: this.pickString(matchedPackage || {}, [
                'logistics_status',
                'logisticsStatus',
                'fulfillment_status',
            ]),
            logisticsChannelId: this.pickNumber(matchedPackage || {}, [
                'logistics_channel_id',
                'logisticsChannelId',
            ]),
            logisticsChannelName: this.pickString(matchedPackage || {}, [
                'logistics_channel_name',
                'logisticsChannelName',
                'channel_name',
            ]),
            serviceCode: this.pickString(matchedPackage || {}, ['service_code', 'serviceCode']),
            shippingDocumentStatus: this.pickString(matchedPackage || {}, [
                'shipping_document_status',
                'shippingDocumentStatus',
            ]),
            shippingDocumentType: this.pickString(matchedPackage || {}, [
                'shipping_document_type',
                'shippingDocumentType',
            ]),
            package: matchedPackage || null,
        };
    }
    async applyWebhookPackageHints(input) {
        if (!input.packageNumber) {
            return [];
        }
        const packageContext = input.fallbackContext ||
            (await this.findOrderByPackageNumber(input.packageNumber));
        if (!packageContext) {
            return [];
        }
        const orderRow = await this.prisma.erpOrder.findUnique({
            where: { orderNo: packageContext.orderNo },
            select: { rawJson: true },
        });
        if (!orderRow || typeof orderRow.rawJson !== 'object' || Array.isArray(orderRow.rawJson)) {
            return [];
        }
        const raw = { ...orderRow.rawJson };
        const changedFields = this.collectWebhookPackageHintFields(input.body);
        if (changedFields.length === 0) {
            return [];
        }
        const packageList = this.extractArray(raw, ['package_list']).map((item) => {
            const pkg = { ...item };
            if (this.pickString(pkg, ['package_number', 'packageNumber']) !== input.packageNumber) {
                return pkg;
            }
            const realFieldList = Array.from(new Set([
                ...this.extractArray(pkg, ['_real_fields']).filter((item) => typeof item === 'string'),
                ...(this.pickString(input.body, ['tracking_number', 'trackingNumber', 'data.tracking_number'])
                    ? ['tracking_number']
                    : []),
                ...(this.pickString(input.body, ['logistics_status', 'logisticsStatus', 'data.logistics_status'])
                    ? ['logistics_status']
                    : []),
                ...(this.pickString(input.body, ['shipping_carrier', 'shippingCarrier', 'data.shipping_carrier'])
                    ? ['shipping_carrier']
                    : []),
                ...(this.pickString(input.body, ['logistics_channel_name', 'logisticsChannelName', 'data.logistics_channel_name'])
                    ? ['logistics_channel_name']
                    : []),
                ...(this.pickString(input.body, ['service_code', 'serviceCode', 'data.service_code'])
                    ? ['service_code']
                    : []),
                ...(this.pickString(input.body, ['shipping_document_status', 'shippingDocumentStatus', 'data.shipping_document_status'])
                    ? ['shipping_document_status']
                    : []),
                ...(this.pickString(input.body, ['shipping_document_type', 'shippingDocumentType', 'data.shipping_document_type'])
                    ? ['shipping_document_type']
                    : []),
            ]));
            return {
                ...pkg,
                ...(this.pickString(input.body, ['tracking_number', 'trackingNumber', 'data.tracking_number'])
                    ? {
                        tracking_number: this.pickString(input.body, [
                            'tracking_number',
                            'trackingNumber',
                            'data.tracking_number',
                        ]),
                    }
                    : {}),
                ...(this.pickString(input.body, ['logistics_status', 'logisticsStatus', 'data.logistics_status'])
                    ? {
                        logistics_status: this.pickString(input.body, [
                            'logistics_status',
                            'logisticsStatus',
                            'data.logistics_status',
                        ]),
                    }
                    : {}),
                ...(this.pickString(input.body, ['shipping_carrier', 'shippingCarrier', 'data.shipping_carrier'])
                    ? {
                        shipping_carrier: this.pickString(input.body, [
                            'shipping_carrier',
                            'shippingCarrier',
                            'data.shipping_carrier',
                        ]),
                    }
                    : {}),
                ...(this.pickNumber(input.body, ['logistics_channel_id', 'logisticsChannelId', 'data.logistics_channel_id'])
                    ? {
                        logistics_channel_id: this.pickNumber(input.body, [
                            'logistics_channel_id',
                            'logisticsChannelId',
                            'data.logistics_channel_id',
                        ]),
                    }
                    : {}),
                ...(this.pickString(input.body, ['logistics_channel_name', 'logisticsChannelName', 'data.logistics_channel_name'])
                    ? {
                        logistics_channel_name: this.pickString(input.body, [
                            'logistics_channel_name',
                            'logisticsChannelName',
                            'data.logistics_channel_name',
                        ]),
                    }
                    : {}),
                ...(this.pickString(input.body, ['service_code', 'serviceCode', 'data.service_code'])
                    ? {
                        service_code: this.pickString(input.body, [
                            'service_code',
                            'serviceCode',
                            'data.service_code',
                        ]),
                    }
                    : {}),
                ...(this.pickString(input.body, ['shipping_document_status', 'shippingDocumentStatus', 'data.shipping_document_status'])
                    ? {
                        shipping_document_status: this.pickString(input.body, [
                            'shipping_document_status',
                            'shippingDocumentStatus',
                            'data.shipping_document_status',
                        ]),
                    }
                    : {}),
                ...(this.pickString(input.body, ['shipping_document_type', 'shippingDocumentType', 'data.shipping_document_type'])
                    ? {
                        shipping_document_type: this.pickString(input.body, [
                            'shipping_document_type',
                            'shippingDocumentType',
                            'data.shipping_document_type',
                        ]),
                    }
                    : {}),
                _source: 'REALTIME_SYNCED',
                _real_fields: realFieldList,
            };
        });
        raw.package_list = packageList;
        const existingSyncMeta = typeof raw._sync_meta === 'object' && raw._sync_meta !== null
            ? raw._sync_meta
            : {};
        const nextFallbackFields = this.extractArray(existingSyncMeta, ['fallback_fields'])
            .filter((item) => typeof item === 'string')
            .filter((field) => !changedFields.includes(field));
        raw._sync_meta = {
            ...existingSyncMeta,
            last_sync_time: new Date().toISOString(),
            last_trigger_type: 'webhook',
            last_result: 'success',
            package_source: 'REALTIME_SYNCED',
            fallback_fields: nextFallbackFields,
        };
        await this.upsertPackageMasterFromWebhookHint({
            packageContext,
            body: input.body,
        });
        await this.prisma.erpOrder.update({
            where: { orderNo: packageContext.orderNo },
            data: {
                rawJson: raw,
            },
        });
        return changedFields;
    }
    async upsertPackageMasterFromWebhookHint(input) {
        const now = new Date();
        const existing = await this.prisma.erpOrderPackage.findUnique({
            where: {
                packageNumber: input.packageContext.packageNumber,
            },
        });
        const shippingDocumentType = this.pickString(input.body, [
            'shipping_document_type',
            'shippingDocumentType',
            'data.shipping_document_type',
        ]);
        const shippingDocumentStatus = this.pickString(input.body, [
            'shipping_document_status',
            'shippingDocumentStatus',
            'data.shipping_document_status',
        ]);
        const documentUrl = shippingDocumentType ||
            existing?.shippingDocumentType ||
            input.packageContext.shippingDocumentType
            ? this.buildShippingDocumentDownloadUrl(input.packageContext.packageNumber, shippingDocumentType ||
                existing?.shippingDocumentType ||
                input.packageContext.shippingDocumentType)
            : existing?.documentUrl || undefined;
        const baseRawFragment = existing?.rawFragment && typeof existing.rawFragment === 'object' && !Array.isArray(existing.rawFragment)
            ? existing.rawFragment
            : input.packageContext.package || {};
        const nextRawFragment = {
            ...baseRawFragment,
            ...(this.pickString(input.body, ['tracking_number', 'trackingNumber', 'data.tracking_number'])
                ? {
                    tracking_number: this.pickString(input.body, [
                        'tracking_number',
                        'trackingNumber',
                        'data.tracking_number',
                    ]),
                }
                : {}),
            ...(this.pickString(input.body, ['logistics_status', 'logisticsStatus', 'data.logistics_status'])
                ? {
                    logistics_status: this.pickString(input.body, [
                        'logistics_status',
                        'logisticsStatus',
                        'data.logistics_status',
                    ]),
                }
                : {}),
            ...(this.pickString(input.body, ['shipping_carrier', 'shippingCarrier', 'data.shipping_carrier'])
                ? {
                    shipping_carrier: this.pickString(input.body, [
                        'shipping_carrier',
                        'shippingCarrier',
                        'data.shipping_carrier',
                    ]),
                }
                : {}),
            ...(this.pickNumber(input.body, ['logistics_channel_id', 'logisticsChannelId', 'data.logistics_channel_id'])
                ? {
                    logistics_channel_id: this.pickNumber(input.body, [
                        'logistics_channel_id',
                        'logisticsChannelId',
                        'data.logistics_channel_id',
                    ]),
                }
                : {}),
            ...(this.pickString(input.body, ['logistics_channel_name', 'logisticsChannelName', 'data.logistics_channel_name'])
                ? {
                    logistics_channel_name: this.pickString(input.body, [
                        'logistics_channel_name',
                        'logisticsChannelName',
                        'data.logistics_channel_name',
                    ]),
                }
                : {}),
            ...(this.pickString(input.body, ['service_code', 'serviceCode', 'data.service_code'])
                ? {
                    service_code: this.pickString(input.body, [
                        'service_code',
                        'serviceCode',
                        'data.service_code',
                    ]),
                }
                : {}),
            ...(shippingDocumentStatus ? { shipping_document_status: shippingDocumentStatus } : {}),
            ...(shippingDocumentType ? { shipping_document_type: shippingDocumentType } : {}),
            ...(documentUrl ? { document_url: documentUrl } : {}),
            ...(shippingDocumentStatus || shippingDocumentType
                ? { last_document_sync_time: now.toISOString() }
                : {}),
        };
        await this.prisma.erpOrderPackage.upsert({
            where: {
                packageNumber: input.packageContext.packageNumber,
            },
            create: {
                channel: client_1.ChannelCode.SHOPEE,
                siteCode: input.packageContext.siteCode || 'BR',
                shopId: input.packageContext.shopId,
                orderId: input.packageContext.orderId || undefined,
                orderNo: input.packageContext.orderNo,
                orderSn: input.packageContext.orderSn,
                packageNumber: input.packageContext.packageNumber,
                trackingNumber: this.pickString(input.body, ['tracking_number', 'trackingNumber', 'data.tracking_number']) ||
                    input.packageContext.trackingNumber,
                packageStatus: this.pickString(baseRawFragment, ['package_status', 'packageStatus']) || undefined,
                packageFulfillmentStatus: this.pickString(baseRawFragment, ['fulfillment_status', 'packageFulfillmentStatus']) || undefined,
                logisticsStatus: this.pickString(input.body, ['logistics_status', 'logisticsStatus', 'data.logistics_status']) ||
                    input.packageContext.logisticsStatus,
                shippingCarrier: this.pickString(input.body, ['shipping_carrier', 'shippingCarrier', 'data.shipping_carrier']) ||
                    input.packageContext.shippingCarrier,
                logisticsChannelId: this.pickNumber(input.body, ['logistics_channel_id', 'logisticsChannelId', 'data.logistics_channel_id']) ??
                    input.packageContext.logisticsChannelId,
                logisticsChannelName: this.pickString(input.body, ['logistics_channel_name', 'logisticsChannelName', 'data.logistics_channel_name']) ||
                    input.packageContext.logisticsChannelName,
                serviceCode: this.pickString(input.body, ['service_code', 'serviceCode', 'data.service_code']) ||
                    input.packageContext.serviceCode,
                shippingDocumentStatus,
                shippingDocumentType,
                documentUrl,
                downloadRef: existing?.downloadRef || undefined,
                logisticsProfile: existing?.logisticsProfile || input.packageContext.logisticsProfile,
                parcelItemCount: existing?.parcelItemCount || input.packageContext.parcelItemCount || 0,
                latestPackageUpdateTime: now,
                lastDocumentSyncTime: shippingDocumentStatus || shippingDocumentType ? now : undefined,
                rawFragment: nextRawFragment,
                sourceRaw: existing?.sourceRaw ||
                    input.packageContext.package,
                lastSyncTime: now,
            },
            update: {
                trackingNumber: this.pickString(input.body, ['tracking_number', 'trackingNumber', 'data.tracking_number']) ||
                    existing?.trackingNumber ||
                    input.packageContext.trackingNumber ||
                    undefined,
                logisticsStatus: this.pickString(input.body, ['logistics_status', 'logisticsStatus', 'data.logistics_status']) ||
                    existing?.logisticsStatus ||
                    input.packageContext.logisticsStatus ||
                    undefined,
                shippingCarrier: this.pickString(input.body, ['shipping_carrier', 'shippingCarrier', 'data.shipping_carrier']) ||
                    existing?.shippingCarrier ||
                    input.packageContext.shippingCarrier ||
                    undefined,
                logisticsChannelId: this.pickNumber(input.body, ['logistics_channel_id', 'logisticsChannelId', 'data.logistics_channel_id']) ??
                    existing?.logisticsChannelId ??
                    input.packageContext.logisticsChannelId ??
                    undefined,
                logisticsChannelName: this.pickString(input.body, ['logistics_channel_name', 'logisticsChannelName', 'data.logistics_channel_name']) ||
                    existing?.logisticsChannelName ||
                    input.packageContext.logisticsChannelName ||
                    undefined,
                serviceCode: this.pickString(input.body, ['service_code', 'serviceCode', 'data.service_code']) ||
                    existing?.serviceCode ||
                    input.packageContext.serviceCode ||
                    undefined,
                shippingDocumentStatus: shippingDocumentStatus || existing?.shippingDocumentStatus || undefined,
                shippingDocumentType: shippingDocumentType || existing?.shippingDocumentType || undefined,
                documentUrl,
                rawFragment: nextRawFragment,
                lastDocumentSyncTime: shippingDocumentStatus || shippingDocumentType
                    ? now
                    : existing?.lastDocumentSyncTime || undefined,
                latestPackageUpdateTime: now,
                lastSyncTime: now,
            },
        });
    }
    stringifyComparable(value) {
        if (value === undefined) {
            return '__undefined__';
        }
        try {
            return JSON.stringify(value);
        }
        catch {
            return String(value);
        }
    }
    collectWebhookPackageHintFields(body) {
        return [
            ...(this.pickString(body, ['tracking_number', 'trackingNumber', 'data.tracking_number'])
                ? ['tracking_number']
                : []),
            ...(this.pickString(body, ['logistics_status', 'logisticsStatus', 'data.logistics_status'])
                ? ['logistics_status']
                : []),
            ...(this.pickString(body, ['shipping_carrier', 'shippingCarrier', 'data.shipping_carrier'])
                ? ['shipping_carrier']
                : []),
            ...(this.pickNumber(body, ['logistics_channel_id', 'logisticsChannelId', 'data.logistics_channel_id'])
                ? ['logistics_channel_id']
                : []),
            ...(this.pickString(body, ['logistics_channel_name', 'logisticsChannelName', 'data.logistics_channel_name'])
                ? ['logistics_channel_name']
                : []),
            ...(this.pickString(body, ['service_code', 'serviceCode', 'data.service_code'])
                ? ['service_code']
                : []),
            ...(this.pickString(body, ['shipping_document_status', 'shippingDocumentStatus', 'data.shipping_document_status'])
                ? ['shipping_document_status']
                : []),
            ...(this.pickString(body, ['shipping_document_type', 'shippingDocumentType', 'data.shipping_document_type'])
                ? ['shipping_document_type']
                : []),
        ];
    }
    packageFieldExists(raw, key) {
        return this.extractArray(raw, ['package_list']).some((item) => this.hasAnyPath(item, [key]));
    }
    hasAnyPath(source, paths) {
        return paths.some((path) => this.hasPath(source, path));
    }
    hasPath(source, path) {
        const segments = path.split('.');
        let current = source;
        for (const segment of segments) {
            if (!current || typeof current !== 'object' || Array.isArray(current)) {
                return false;
            }
            if (!(segment in current)) {
                return false;
            }
            current = current[segment];
        }
        return true;
    }
    pickHeaderValue(source, keys) {
        for (const key of keys) {
            const raw = source[key];
            if (typeof raw === 'string' && raw.trim()) {
                return raw.trim();
            }
            if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].trim()) {
                return raw[0].trim();
            }
        }
        return undefined;
    }
    chunkStrings(values, size) {
        const chunks = [];
        for (let index = 0; index < values.length; index += size) {
            chunks.push(values.slice(index, index + size));
        }
        return chunks;
    }
    async tryLoadProducts(sdk) {
        try {
            if (!sdk.product?.getItemList) {
                return null;
            }
            return await sdk.product.getItemList({
                offset: 0,
                page_size: 50,
                item_status: ['NORMAL'],
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown product sync error';
            this.logger.warn(`Product sync request failed: ${message}`);
            return null;
        }
    }
    buildFrontendRedirectUrl(params) {
        return this.runtimeConfigService.buildFrontendCallbackUrl({
            status: params.status,
            shopId: params.shopId,
        });
    }
    normalizeShopeeOrderStatus(value) {
        const normalized = String(value || '').trim().toUpperCase();
        if (!normalized) {
            return undefined;
        }
        if (normalized === 'INVOICE_PENDING') {
            return 'PENDING_INVOICE';
        }
        return normalized;
    }
    normalizeOrderStatusRecord(raw) {
        const next = { ...raw };
        const normalizedStatus = this.normalizeShopeeOrderStatus(this.pickString(raw, ['order_status', 'orderStatus', 'status']));
        if (normalizedStatus) {
            next.order_status = normalizedStatus;
            next.orderStatus = normalizedStatus;
            next.status = normalizedStatus;
        }
        return next;
    }
    pickString(source, keys) {
        for (const key of keys) {
            const value = this.readNested(source, key);
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
            if (typeof value === 'number' || typeof value === 'bigint') {
                return String(value);
            }
        }
        return undefined;
    }
    pickNumber(source, keys) {
        for (const key of keys) {
            const value = this.readNested(source, key);
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            if (typeof value === 'string' && value.trim()) {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) {
                    return parsed;
                }
            }
        }
        return undefined;
    }
    pickOptionalNumber(source, keys) {
        return this.pickNumber(source, keys);
    }
    pickDate(source, keys) {
        for (const key of keys) {
            const value = this.readNested(source, key);
            if (value instanceof Date && !Number.isNaN(value.getTime())) {
                return value;
            }
            if (typeof value === 'number' && Number.isFinite(value)) {
                const timestamp = value > 1e12 ? value : value * 1000;
                return new Date(timestamp);
            }
            if (typeof value === 'string' && value.trim()) {
                const numeric = Number(value);
                if (Number.isFinite(numeric) && /^\d+$/.test(value.trim())) {
                    const timestamp = numeric > 1e12 ? numeric : numeric * 1000;
                    return new Date(timestamp);
                }
                const parsed = new Date(value);
                if (!Number.isNaN(parsed.getTime())) {
                    return parsed;
                }
            }
        }
        return undefined;
    }
    deriveLogisticsProfile(input) {
        const carrier = String(input.shippingCarrier || '').toUpperCase();
        const channelId = Number(input.logisticsChannelId || 0);
        if (channelId === 30029 || carrier.includes('SHOPEE XPRESS') || carrier.includes('SPX')) {
            return 'SHOPEE_XPRESS';
        }
        if (channelId === 90022 ||
            carrier.includes('ENTREGA DIRETA') ||
            carrier.includes('DIRECT DELIVERY')) {
            return 'DIRECT_DELIVERY';
        }
        return 'OTHER';
    }
    pickPriceString(source, preferredKeys = ['price', 'current_price', 'price_info', 'price_info.current_price']) {
        for (const key of preferredKeys) {
            const value = this.readNested(source, key);
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value.toFixed(2);
            }
            if (typeof value === 'string' && value.trim()) {
                const normalized = value.replace(',', '.');
                const parsed = Number(normalized);
                if (Number.isFinite(parsed)) {
                    return parsed.toFixed(2);
                }
            }
            if (Array.isArray(value) && value.length > 0) {
                const first = value[0];
                return this.pickPriceString(first, ['original_price', 'current_price']);
            }
        }
        return '0.00';
    }
    extractArray(source, candidates) {
        if (!source || typeof source !== 'object') {
            return [];
        }
        const record = source;
        for (const candidate of candidates) {
            const value = this.readNested(record, candidate);
            if (Array.isArray(value)) {
                return value;
            }
        }
        return [];
    }
    readNested(source, path) {
        return path.split('.').reduce((current, segment) => {
            if (!current || typeof current !== 'object') {
                return undefined;
            }
            return current[segment];
        }, source);
    }
};
exports.ShopeeService = ShopeeService;
exports.ShopeeService = ShopeeService = ShopeeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [runtime_config_service_1.RuntimeConfigService,
        prisma_service_1.PrismaService])
], ShopeeService);
//# sourceMappingURL=shopee.service.js.map