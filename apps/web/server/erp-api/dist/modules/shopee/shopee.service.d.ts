import { Prisma } from '@prisma/client';
import { RuntimeConfigService } from '../../common/config/runtime-config.service';
import { PrismaService } from '../database/prisma.service';
type OrderSyncPayload = {
    orderId?: string;
    orderIds?: string[];
    orderNo?: string;
    orderNos?: string[];
    orderSn?: string;
    shopId?: string;
    days?: number;
    limit?: number;
};
type SyncTriggerType = 'manual_detail' | 'manual_status' | 'sync_recent' | 'webhook' | 'invoice_add' | 'shipping_parameter' | 'shipping_parameter_mass' | 'ship' | 'ship_batch' | 'ship_mass' | 'tracking_sync' | 'tracking_sync_mass' | 'tracking_retry' | 'shipping_update';
type SyncResultStatus = 'success' | 'partial' | 'failed';
type WebhookCallbackPayload = {
    query: Record<string, unknown>;
    body: Record<string, unknown>;
    headers: Record<string, unknown>;
    rawBody?: string;
};
type WebhookValidationResult = {
    checked: boolean;
    passed: boolean;
    mode: 'signature' | 'best_effort' | 'skipped';
    message: string;
};
type SyncRecentPayload = {
    shopId?: string;
    days?: number;
    limit?: number;
};
type ShippingDocumentPayload = OrderSyncPayload & {
    packageNumber?: string;
    packageNumbers?: string[];
    shippingDocumentType?: string;
};
type AddInvoicePayload = OrderSyncPayload & {
    packageNumber?: string;
    invoiceData?: Record<string, unknown>;
};
type PackageReferenceInput = {
    orderSn?: string;
    orderNo?: string;
    packageNumber?: string;
};
type ShippingTargetPayload = OrderSyncPayload & {
    packageNumber?: string;
    packageNumbers?: string[];
    packages?: PackageReferenceInput[];
    orderList?: Array<{
        orderSn?: string;
        packageNumber?: string;
    }>;
};
type ShippingParameterPayload = ShippingTargetPayload & {
    logisticsChannelId?: number;
    productLocationId?: string;
};
type ShipPickupPayload = {
    addressId?: number;
    pickupTimeId?: string;
    trackingNumber?: string;
};
type ShipDropoffPayload = {
    branchId?: number;
    senderRealName?: string;
    trackingNumber?: string;
};
type NonIntegratedTrackingPayload = {
    packageNumber: string;
    trackingNumber: string;
};
type ShipExecutionPayload = ShippingTargetPayload & {
    logisticsChannelId?: number;
    productLocationId?: string;
    trackingNo?: string;
    pickup?: ShipPickupPayload;
    dropoff?: ShipDropoffPayload;
    nonIntegrated?: {
        trackingNumber?: string;
        trackingList?: NonIntegratedTrackingPayload[];
    };
};
type TrackingPayload = ShippingTargetPayload & {
    responseOptionalFields?: string;
};
type UpdateShippingPayload = ShippingTargetPayload & {
    pickup?: {
        addressId?: number;
        pickupTimeId?: string;
    };
};
type ChannelStrategyProfile = 'SHOPEE_XPRESS' | 'DIRECT_DELIVERY' | 'OTHER';
type ShippingMode = 'pickup' | 'dropoff' | 'non_integrated' | 'unknown';
type ChannelStrategy = {
    profile: ChannelStrategyProfile;
    packageKeyMode: 'PACKAGE_NUMBER';
    supportsSingle: true;
    supportsBatch: boolean;
    supportsMass: boolean;
    prefersMass: boolean;
    updateMode: 'pickup_only';
    notes: string[];
};
type AuthCallbackParams = {
    code?: string;
    shopId?: string;
};
export declare class ShopeeService {
    private readonly runtimeConfigService;
    private readonly prisma;
    private readonly logger;
    private readonly authPartnerPath;
    private readonly scheduledTrackingRetryTimers;
    constructor(runtimeConfigService: RuntimeConfigService, prisma: PrismaService);
    getAuthorizationUrl(): Promise<{
        url: string;
        partnerId: string;
        partnerKeySha256Prefix: string;
        signBaseString: string;
        redirectUrl: string;
        redisEnabled: boolean;
    }>;
    syncAuthorizedShop(shopId: string): Promise<{
        success: boolean;
        shopId: string;
        tokenRefreshed: boolean;
        productsSynced: number;
        ordersSynced: number;
    }>;
    syncShopProducts(shopId: string): Promise<{
        success: boolean;
        scope: string;
        shopId: string;
        tokenRefreshed: boolean;
        productsSynced: number;
    }>;
    syncShopOrders(shopId: string): Promise<{
        success: boolean;
        scope: string;
        shopId: string;
        tokenRefreshed: boolean;
        ordersSynced: number;
    }>;
    syncOrderDetails(payload: OrderSyncPayload): Promise<{
        success: boolean;
        scope: string;
        synced: number;
        failed: string[];
        tokenRefreshed: boolean;
        logsWritten: number;
    }>;
    syncOrderStatuses(payload: OrderSyncPayload): Promise<{
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
    syncRecentOrderDetails(payload: SyncRecentPayload): Promise<{
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
    addInvoiceData(payload: AddInvoicePayload): Promise<{
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
    createShippingDocument(payload: ShippingDocumentPayload): Promise<{
        success: boolean;
        scope: string;
        requested: number;
        failed: string[];
        resultSynced: number;
        logsWritten: number;
    }>;
    syncShippingDocumentResult(payload: ShippingDocumentPayload): Promise<{
        success: boolean;
        scope: string;
        synced: number;
        failed: string[];
        logsWritten: number;
    }>;
    getShippingParameter(payload: ShippingParameterPayload): Promise<{
        success: boolean;
        data: {
            raw: null;
            source: "get_shipping_parameter" | "get_mass_shipping_parameter";
            checkedAt: string;
            logisticsProfile: ChannelStrategyProfile;
            logisticsChannelId?: number;
            logisticsChannelName?: string;
            serviceCode?: string;
            shippingMode: ShippingMode;
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
            channelStrategy: ChannelStrategy;
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
            logisticsProfile: ChannelStrategyProfile;
            logisticsChannelId: number | undefined;
            logisticsChannelName: string | undefined;
            serviceCode: string | undefined;
            shippingMode: ShippingMode;
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
            channelStrategy: ChannelStrategy;
            raw: unknown;
        };
    }>;
    getMassShippingParameter(payload: ShippingParameterPayload): Promise<{
        success: boolean;
        data: {
            scope: string;
            groups: Record<string, unknown>[];
        };
    }>;
    shipOrder(payload: ShipExecutionPayload): Promise<{
        success: boolean;
        data: {
            scope: string;
            shopId: string;
            orderNo: string;
            orderSn: string;
            packageNumber: string;
            shippingMode: ShippingMode;
            logisticsProfile: ChannelStrategyProfile;
            channelStrategy: ChannelStrategy;
            refreshed: boolean;
            response: unknown;
        };
    }>;
    batchShipOrder(payload: ShipExecutionPayload): Promise<{
        success: boolean;
        data: {
            scope: string;
            groups: Record<string, unknown>[];
        };
    }>;
    massShipOrder(payload: ShipExecutionPayload): Promise<{
        success: boolean;
        data: {
            scope: string;
            groups: Record<string, unknown>[];
        };
    }>;
    getTrackingNumber(payload: TrackingPayload): Promise<{
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
    getMassTrackingNumber(payload: TrackingPayload): Promise<{
        success: boolean;
        data: {
            scope: string;
            groups: Record<string, unknown>[];
        };
    }>;
    getShippingDocumentParameter(payload: ShippingTargetPayload): Promise<{
        success: boolean;
        data: {
            shopId: string;
            orderNo: string;
            orderSn: string;
            packageNumber: string;
            logisticsProfile: ChannelStrategyProfile;
            shippingDocumentType: string;
            selectableShippingDocumentType: string[];
            channelStrategy: ChannelStrategy;
            parameterSource: string;
            raw: unknown;
        };
    }>;
    updateShippingOrder(payload: UpdateShippingPayload): Promise<{
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
    downloadShippingDocument(payload: {
        packageNumber?: string;
        shippingDocumentType?: string;
    }): Promise<{
        buffer: Buffer<ArrayBufferLike>;
        contentType: string;
        fileName: string;
    }>;
    getOrderSyncLogs(query: {
        current?: number;
        pageSize?: number;
        shopId?: string;
        orderNo?: string;
        orderSn?: string;
        packageNumber?: string;
        triggerType?: SyncTriggerType;
        resultStatus?: SyncResultStatus;
        startTime?: string;
        endTime?: string;
    }): Promise<{
        success: boolean;
        data: {
            logId: string;
            triggerType: string;
            shopId: string | null;
            orderNo: string | null;
            orderSn: string | null;
            packageNumber: string | null;
            requestPayloadSummary: Prisma.JsonValue;
            resultStatus: string;
            changedFields: Prisma.JsonArray;
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
            downloadRef: Prisma.JsonValue;
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
    handlePushCallback(payload: WebhookCallbackPayload): Promise<{
        success: boolean;
        accepted: boolean;
        eventType: string;
        validation: WebhookValidationResult;
        message: string;
        synced?: undefined;
        failed?: undefined;
        logsWritten?: undefined;
    } | {
        success: boolean;
        accepted: boolean;
        eventType: string;
        validation: WebhookValidationResult;
        synced: number;
        failed: string[];
        logsWritten: number;
        message?: undefined;
    }>;
    private syncOrderDetailsInternal;
    private syncOrderStatusesInternal;
    private syncRecentOrderDetailsInternal;
    private addInvoiceDataInternal;
    private resolveInvoiceMutationTarget;
    private buildInvoiceDataPayload;
    private parseInvoiceIssueDate;
    private pickDecimalNumber;
    private patchOrderInvoiceData;
    private refreshOrderDetailWithoutLog;
    private getShippingParameterInternal;
    private getMassShippingParameterInternal;
    private shipOrderInternal;
    private batchShipOrderInternal;
    private massShipOrderInternal;
    private getTrackingNumberInternal;
    private getMassTrackingNumberInternal;
    private updateShippingOrderInternal;
    private resolvePackageTargets;
    private assertSingleTarget;
    private buildInvoiceGateState;
    private buildChannelStrategy;
    private buildParameterFallbackSnapshot;
    private normalizeShippingParameterResponse;
    private normalizeMassShippingParameterResponse;
    private getSingleShippingParameterSnapshot;
    private getShippingParameterSnapshots;
    private getMassShippingParameterSnapshot;
    private assertShippableTargets;
    private assertSingleShippingMode;
    private buildSingleShipPayload;
    private buildSharedShipModePayload;
    private buildMassShipModePayload;
    private buildPickupPayload;
    private buildDropoffPayload;
    private buildNonIntegratedPayload;
    private buildUpdatePickupPayload;
    private groupTargetsByShopAndMode;
    private groupTargetsForMassAction;
    private extractPackageProductLocationId;
    private refreshUniqueOrdersWithoutLog;
    private patchPackageTrackingData;
    private scheduleTrackingRetry;
    private runScheduledTrackingRetry;
    private extractInfoNeededObject;
    private determineShippingMode;
    private buildParameterErrorsFromResponse;
    private pickObjectValue;
    private createShippingDocumentInternal;
    private syncShippingDocumentResultInternal;
    private getShippingDocumentTargets;
    private groupShippingDocumentTargets;
    private resolveShippingDocumentType;
    private upsertPackageMasterFromDocumentSync;
    private buildShippingDocumentDownloadUrl;
    private patchOrderRawPackage;
    buildAuthorizationFailureRedirect(input: {
        shopId?: string;
        message: string;
    }): string;
    handleAuthorizationCallback(params: AuthCallbackParams): Promise<{
        redirectUrl: string;
    }>;
    private createSdk;
    private buildAuthorizationSignatureDebug;
    private loadShopeeSdkModule;
    private getRegion;
    private getShopeeBaseUrl;
    private exchangeCodeForToken;
    private buildTokenExchangeDebug;
    private createMemoryTokenStorage;
    private parseShopeeJsonResponse;
    private loadShopInfo;
    private persistAuthorizedShop;
    private refreshAccessTokenIfNeeded;
    private prepareShopSync;
    private syncInitialProducts;
    private enrichProductRows;
    private enrichProductRowsWithModels;
    private syncInitialOrders;
    private resolveOrderTargets;
    private groupTargetsByShop;
    private syncOrderDetailsForShop;
    private syncOrderListRows;
    private loadOrderDetails;
    private enrichOrderDetailsWithPackageData;
    private decorateSyncMeta;
    private getFallbackOrderFields;
    private upsertOrderRows;
    private upsertPackageMasterRows;
    private loadOrdersByTimeWindow;
    private buildSyncPayloadSummary;
    private writeSyncLogs;
    private validateWebhookSignature;
    private extractWebhookDispatchContext;
    private resolveWebhookEventType;
    private buildWebhookBodySummary;
    private computeChangedFields;
    private findOrderByPackageNumber;
    private applyWebhookPackageHints;
    private upsertPackageMasterFromWebhookHint;
    private stringifyComparable;
    private collectWebhookPackageHintFields;
    private packageFieldExists;
    private hasAnyPath;
    private hasPath;
    private pickHeaderValue;
    private chunkStrings;
    private tryLoadProducts;
    private buildFrontendRedirectUrl;
    private normalizeShopeeOrderStatus;
    private normalizeOrderStatusRecord;
    private pickString;
    private pickNumber;
    private pickOptionalNumber;
    private pickDate;
    private deriveLogisticsProfile;
    private pickPriceString;
    private extractArray;
    private readNested;
}
export {};
