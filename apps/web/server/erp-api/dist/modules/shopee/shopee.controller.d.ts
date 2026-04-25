import type { Response } from 'express';
import { ShopeeService } from './shopee.service';
export declare class ShopeeController {
    private readonly shopeeService;
    private readonly logger;
    constructor(shopeeService: ShopeeService);
    getAuthorizationUrl(): Promise<{
        url: string;
        partnerId: string;
        partnerKeySha256Prefix: string;
        signBaseString: string;
        redirectUrl: string;
        redisEnabled: boolean;
    }>;
    handlePushVerification(query: Record<string, unknown>): {
        success: boolean;
    };
    handlePushCallback(query: Record<string, unknown>, body: Record<string, unknown>, req: {
        headers: Record<string, unknown>;
        rawBody?: Buffer | string;
    }): Promise<{
        success: boolean;
        accepted: boolean;
        eventType: string;
        validation: {
            checked: boolean;
            passed: boolean;
            mode: "signature" | "best_effort" | "skipped";
            message: string;
        };
        message: string;
        synced?: undefined;
        failed?: undefined;
        logsWritten?: undefined;
    } | {
        success: boolean;
        accepted: boolean;
        eventType: string;
        validation: {
            checked: boolean;
            passed: boolean;
            mode: "signature" | "best_effort" | "skipped";
            message: string;
        };
        synced: number;
        failed: string[];
        logsWritten: number;
        message?: undefined;
    }>;
    syncOrderDetail(body: {
        orderId?: string;
        orderIds?: string[];
        orderNo?: string;
        orderNos?: string[];
        shopId?: string;
    }): Promise<{
        success: boolean;
        scope: string;
        synced: number;
        failed: string[];
        tokenRefreshed: boolean;
        logsWritten: number;
    }>;
    syncOrderStatus(body: {
        orderId?: string;
        orderIds?: string[];
        orderNo?: string;
        orderNos?: string[];
        shopId?: string;
        days?: number;
        limit?: number;
    }): Promise<{
        success: boolean;
        scope: string;
        days: number;
        limit: number;
        shops: number;
        scanned: number;
        synced: number;
        failedShops: string[];
        tokenRefreshed: boolean;
        logsWritten: number;
    } | {
        scope: string;
        success: boolean;
        synced: number;
        failed: string[];
        tokenRefreshed: boolean;
        logsWritten: number;
    }>;
    syncRecentOrderDetails(body: {
        shopId?: string;
        days?: number;
        limit?: number;
    }): Promise<{
        success: boolean;
        scope: string;
        days: number;
        limit: number;
        shops: number;
        scanned: number;
        synced: number;
        failedShops: string[];
        tokenRefreshed: boolean;
        logsWritten: number;
    }>;
    addInvoiceData(body: {
        orderId?: string;
        orderIds?: string[];
        orderNo?: string;
        orderSn?: string;
        orderNos?: string[];
        shopId?: string;
        packageNumber?: string;
        invoiceData?: Record<string, unknown>;
    }): Promise<{
        success: boolean;
        data: {
            scope: string;
            shopId: string;
            orderNo: string;
            orderSn: string;
            packageNumber: string | undefined;
            refreshed: boolean;
            orderStatus: string | undefined;
            response: unknown;
        };
        errorMessage?: undefined;
    } | {
        success: boolean;
        errorMessage: string;
        data: {
            scope: string;
            shopId: string;
            orderNo: string;
            orderSn: string;
            packageNumber: string | undefined;
            refreshed?: undefined;
            orderStatus?: undefined;
            response?: undefined;
        };
    }>;
    createShippingDocument(body: {
        orderId?: string;
        orderIds?: string[];
        orderNo?: string;
        orderNos?: string[];
        shopId?: string;
        packageNumber?: string;
        packageNumbers?: string[];
        shippingDocumentType?: string;
    }): Promise<{
        success: boolean;
        scope: string;
        requested: number;
        failed: string[];
        resultSynced: number;
        logsWritten: number;
    }>;
    getShippingParameter(shopId?: string, orderId?: string, orderNo?: string, orderSn?: string, packageNumber?: string): Promise<{
        success: boolean;
        data: {
            raw: null;
            source: "get_shipping_parameter" | "get_mass_shipping_parameter";
            checkedAt: string;
            logisticsProfile: "SHOPEE_XPRESS" | "DIRECT_DELIVERY" | "OTHER";
            logisticsChannelId?: number;
            logisticsChannelName?: string;
            serviceCode?: string;
            shippingMode: "pickup" | "dropoff" | "non_integrated" | "unknown";
            infoNeeded: {
                pickup: string[];
                dropoff: string[];
                nonIntegrated: string[];
            };
            canShip: boolean;
            missingPreconditions: string[];
            pickup?: Record<string, unknown>;
            dropoff?: Record<string, unknown>;
            nonIntegrated?: Record<string, unknown>;
            parameterSource: string;
            channelStrategy: {
                profile: "SHOPEE_XPRESS" | "DIRECT_DELIVERY" | "OTHER";
                packageKeyMode: "PACKAGE_NUMBER";
                supportsSingle: true;
                supportsBatch: boolean;
                supportsMass: boolean;
                prefersMass: boolean;
                updateMode: "pickup_only";
                notes: string[];
            };
            shopId?: undefined;
            orderNo?: undefined;
            orderSn?: undefined;
            packageNumber?: undefined;
        };
    } | {
        success: boolean;
        data: {
            shopId: string;
            orderNo: string;
            orderSn: string;
            packageNumber: string;
            logisticsProfile: "SHOPEE_XPRESS" | "DIRECT_DELIVERY" | "OTHER";
            logisticsChannelId: number | undefined;
            logisticsChannelName: string | undefined;
            serviceCode: string | undefined;
            shippingMode: "pickup" | "dropoff" | "non_integrated" | "unknown";
            infoNeeded: {
                pickup: string[];
                dropoff: string[];
                nonIntegrated: string[];
            };
            canShip: boolean;
            missingPreconditions: string[];
            pickup: Record<string, unknown> | undefined;
            dropoff: Record<string, unknown> | undefined;
            nonIntegrated: Record<string, unknown> | undefined;
            parameterSource: string;
            checkedAt: string;
            channelStrategy: {
                profile: "SHOPEE_XPRESS" | "DIRECT_DELIVERY" | "OTHER";
                packageKeyMode: "PACKAGE_NUMBER";
                supportsSingle: true;
                supportsBatch: boolean;
                supportsMass: boolean;
                prefersMass: boolean;
                updateMode: "pickup_only";
                notes: string[];
            };
            raw: unknown;
        };
    }>;
    getMassShippingParameter(body: {
        shopId?: string;
        orderId?: string;
        orderIds?: string[];
        orderNo?: string;
        orderNos?: string[];
        orderSn?: string;
        packageNumber?: string;
        packageNumbers?: string[];
        logisticsChannelId?: number;
        productLocationId?: string;
        packages?: Array<{
            orderSn?: string;
            orderNo?: string;
            packageNumber?: string;
        }>;
    }): Promise<{
        success: boolean;
        data: {
            scope: string;
            groups: Record<string, unknown>[];
        };
    }>;
    shipOrder(body: {
        shopId?: string;
        orderId?: string;
        orderNo?: string;
        orderSn?: string;
        packageNumber?: string;
        trackingNo?: string;
        pickup?: {
            addressId?: number;
            pickupTimeId?: string;
            trackingNumber?: string;
        };
        dropoff?: {
            branchId?: number;
            senderRealName?: string;
            trackingNumber?: string;
        };
        nonIntegrated?: {
            trackingNumber?: string;
        };
    }): Promise<{
        success: boolean;
        data: {
            scope: string;
            shopId: string;
            orderNo: string;
            orderSn: string;
            packageNumber: string;
            shippingMode: "pickup" | "dropoff" | "non_integrated" | "unknown";
            logisticsProfile: "SHOPEE_XPRESS" | "DIRECT_DELIVERY" | "OTHER";
            channelStrategy: {
                profile: "SHOPEE_XPRESS" | "DIRECT_DELIVERY" | "OTHER";
                packageKeyMode: "PACKAGE_NUMBER";
                supportsSingle: true;
                supportsBatch: boolean;
                supportsMass: boolean;
                prefersMass: boolean;
                updateMode: "pickup_only";
                notes: string[];
            };
            refreshed: boolean;
            response: unknown;
        };
    }>;
    batchShipOrder(body: {
        shopId?: string;
        orderId?: string;
        orderIds?: string[];
        orderNo?: string;
        orderNos?: string[];
        orderSn?: string;
        packageNumber?: string;
        packageNumbers?: string[];
        trackingNo?: string;
        pickup?: {
            addressId?: number;
            pickupTimeId?: string;
            trackingNumber?: string;
        };
        dropoff?: {
            branchId?: number;
            senderRealName?: string;
            trackingNumber?: string;
        };
        nonIntegrated?: {
            trackingNumber?: string;
        };
        orderList?: Array<{
            orderSn?: string;
            packageNumber?: string;
        }>;
    }): Promise<{
        success: boolean;
        data: {
            scope: string;
            groups: Record<string, unknown>[];
        };
    }>;
    massShipOrder(body: {
        shopId?: string;
        orderId?: string;
        orderIds?: string[];
        orderNo?: string;
        orderNos?: string[];
        packageNumber?: string;
        packageNumbers?: string[];
        logisticsChannelId?: number;
        productLocationId?: string;
        trackingNo?: string;
        pickup?: {
            addressId?: number;
            pickupTimeId?: string;
        };
        dropoff?: {
            branchId?: number;
            senderRealName?: string;
            trackingNumber?: string;
        };
        nonIntegrated?: {
            trackingList?: Array<{
                packageNumber: string;
                trackingNumber: string;
            }>;
        };
        packages?: Array<{
            orderSn?: string;
            orderNo?: string;
            packageNumber?: string;
        }>;
    }): Promise<{
        success: boolean;
        data: {
            scope: string;
            groups: Record<string, unknown>[];
        };
    }>;
    getTrackingNumber(shopId?: string, orderId?: string, orderNo?: string, orderSn?: string, packageNumber?: string, responseOptionalFields?: string): Promise<{
        success: boolean;
        data: {
            scope: string;
            shopId: string;
            orderNo: string;
            orderSn: string;
            packageNumber: string;
            trackingNumber: string;
            plpNumber: string;
            firstMileTrackingNumber: string;
            lastMileTrackingNumber: string;
            hint: string;
            pickupCode: string;
            response: unknown;
        };
    }>;
    getMassTrackingNumber(body: {
        shopId?: string;
        orderId?: string;
        orderIds?: string[];
        orderNo?: string;
        orderNos?: string[];
        packageNumber?: string;
        packageNumbers?: string[];
        responseOptionalFields?: string;
        packages?: Array<{
            orderSn?: string;
            orderNo?: string;
            packageNumber?: string;
        }>;
    }): Promise<{
        success: boolean;
        data: {
            scope: string;
            groups: Record<string, unknown>[];
        };
    }>;
    getShippingDocumentParameter(shopId?: string, orderId?: string, orderNo?: string, orderSn?: string, packageNumber?: string): Promise<{
        success: boolean;
        data: {
            shopId: string;
            orderNo: string;
            orderSn: string;
            packageNumber: string;
            logisticsProfile: "SHOPEE_XPRESS" | "DIRECT_DELIVERY" | "OTHER";
            shippingDocumentType: string;
            selectableShippingDocumentType: string[];
            channelStrategy: {
                profile: "SHOPEE_XPRESS" | "DIRECT_DELIVERY" | "OTHER";
                packageKeyMode: "PACKAGE_NUMBER";
                supportsSingle: true;
                supportsBatch: boolean;
                supportsMass: boolean;
                prefersMass: boolean;
                updateMode: "pickup_only";
                notes: string[];
            };
            parameterSource: string;
            raw: unknown;
        };
    }>;
    updateShippingOrder(body: {
        shopId?: string;
        orderId?: string;
        orderNo?: string;
        orderSn?: string;
        packageNumber?: string;
        pickup?: {
            addressId?: number;
            pickupTimeId?: string;
        };
    }): Promise<{
        success: boolean;
        data: {
            scope: string;
            shopId: string;
            orderNo: string;
            orderSn: string;
            packageNumber: string;
            pickup: {
                tracking_number?: string | undefined;
                address_id: number | undefined;
                pickup_time_id: string | undefined;
            };
            response: unknown;
            refreshed: boolean;
        };
    }>;
    syncShippingDocumentResult(body: {
        orderId?: string;
        orderIds?: string[];
        orderNo?: string;
        orderNos?: string[];
        shopId?: string;
        packageNumber?: string;
        packageNumbers?: string[];
        shippingDocumentType?: string;
    }): Promise<{
        success: boolean;
        scope: string;
        synced: number;
        failed: string[];
        logsWritten: number;
    }>;
    getOrderSyncLogs(current?: string, pageSize?: string, shopId?: string, orderNo?: string, orderSn?: string, packageNumber?: string, triggerType?: 'manual_detail' | 'manual_status' | 'sync_recent' | 'webhook' | 'invoice_add' | 'shipping_parameter' | 'shipping_parameter_mass' | 'ship' | 'ship_batch' | 'ship_mass' | 'tracking_sync' | 'tracking_sync_mass' | 'shipping_update', resultStatus?: 'success' | 'partial' | 'failed', startTime?: string, endTime?: string): Promise<{
        success: boolean;
        data: {
            logId: string;
            triggerType: string;
            shopId: string | null;
            orderNo: string | null;
            orderSn: string | null;
            packageNumber: string | null;
            requestPayloadSummary: import("@prisma/client/runtime/library").JsonValue;
            resultStatus: string;
            changedFields: import("@prisma/client/runtime/library").JsonArray;
            detailSource: string | null;
            packageSource: string | null;
            message: string | null;
            createdAt: string;
        }[];
        total: number;
        current: number;
        pageSize: number;
    }>;
    getPackageContext(packageNumber?: string): Promise<{
        success: boolean;
        data: {
            id: string;
            shopId: string;
            orderId: string | null;
            orderNo: string;
            orderSn: string;
            orderStatus: string | undefined;
            siteCode: string;
            updatedAt: string;
            packageNumber: string;
            trackingNumber: string | undefined;
            shippingCarrier: string | undefined;
            logisticsStatus: string | undefined;
            logisticsChannelId: number | undefined;
            logisticsChannelName: string | undefined;
            serviceCode: string | undefined;
            shippingDocumentStatus: string | undefined;
            shippingDocumentType: string | undefined;
            documentUrl: string | undefined;
            downloadRef: import("@prisma/client/runtime/library").JsonValue;
            logisticsProfile: string | undefined;
            parcelItemCount: number;
            latestPackageUpdateTime: string | undefined;
            lastDocumentSyncTime: string | undefined;
            package: Record<string, unknown> | null;
        } | {
            id: string;
            shopId: string;
            orderNo: string;
            orderSn: string;
            orderStatus: string;
            siteCode: string;
            updatedAt: string;
            packageNumber: string;
            trackingNumber: string | undefined;
            shippingCarrier: string | undefined;
            logisticsStatus: string | undefined;
            logisticsChannelId: number | undefined;
            logisticsChannelName: string | undefined;
            serviceCode: string | undefined;
            shippingDocumentStatus: string | undefined;
            shippingDocumentType: string | undefined;
            package: Record<string, unknown> | null;
            orderId?: undefined;
            documentUrl?: undefined;
            downloadRef?: undefined;
            logisticsProfile?: undefined;
            parcelItemCount?: undefined;
            latestPackageUpdateTime?: undefined;
            lastDocumentSyncTime?: undefined;
        };
    }>;
    downloadShippingDocument(packageNumber: string | undefined, shippingDocumentType: string | undefined, res: Response): Promise<Response<any, Record<string, any>>>;
    handleCallback(code: string | undefined, shopId: string | undefined, res: Response): Promise<void>;
}
