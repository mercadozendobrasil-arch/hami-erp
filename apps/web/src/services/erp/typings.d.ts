declare namespace ERP {
  type SortOrder = 'ascend' | 'descend' | null | undefined;

  type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type PlatformChannel = 'SHOPEE';
  type PlatformSyncMode = 'ERP_ONLY' | 'READ_FROM_SHOPEE' | 'SYNC_TO_SHOPEE';
  type ShopeeRegionCode = 'BR' | 'SG' | 'MY' | 'TH' | 'TW' | 'PH' | 'VN' | 'ID';
  type ShopeeOrderStatus =
    | 'UNPAID'
    | 'PENDING_INVOICE'
    | 'READY_TO_SHIP'
    | 'PROCESSED'
    | 'SHIPPED'
    | 'TO_CONFIRM_RECEIVE'
    | 'COMPLETED'
    | 'IN_CANCEL'
    | 'CANCELLED'
    | 'RETRY_SHIP'
    | 'TO_RETURN';
  type ShopeePackageStatus = 'PENDING' | 'TO_PROCESS' | 'PROCESSED';
  type ShopeeShippingInfoNeeded = 'pickup' | 'dropoff' | 'non_integrated';
  type ShopeeLogisticsStatus =
    | 'LOGISTICS_NOT_START'
    | 'LOGISTICS_REQUEST_CREATED'
    | 'LOGISTICS_PICKUP_DONE'
    | 'LOGISTICS_PICKUP_RETRY'
    | 'LOGISTICS_PICKUP_FAILED'
    | 'LOGISTICS_DELIVERY_DONE'
    | 'LOGISTICS_DELIVERY_FAILED'
    | 'LOGISTICS_REQUEST_CANCELED'
    | 'LOGISTICS_COD_REJECTED'
    | 'LOGISTICS_READY'
    | 'LOGISTICS_INVALID'
    | 'LOGISTICS_LOST'
    | 'LOGISTICS_PENDING_ARRANGE';
  type ShopeeDataSource = 'REALTIME_SYNCED' | 'DB_RAW_JSON' | 'FALLBACK';
  type FulfillmentStage =
    | 'PAYMENT_PENDING'
    | 'INVOICE_PENDING'
    | 'READY_FOR_SHIPMENT'
    | 'SHIPMENT_PROCESSING'
    | 'IN_TRANSIT'
    | 'WAITING_RECEIPT'
    | 'COMPLETED'
    | 'CANCEL_PROCESSING'
    | 'CANCELLED'
    | 'RETRY_SHIPMENT'
    | 'RETURN_PROCESSING'
    | 'pending_invoice'
    | 'pending_shipment'
    | 'pending_print'
    | 'pending_pickup'
    | 'shipped';
  type RuleType =
    | 'ADDRESS_VALIDATION'
    | 'RISK_CONTROL'
    | 'STOCK_ALLOCATION'
    | 'PLATFORM_SYNC'
    | 'BUYER_CONTROL'
    | 'TIMEOUT_ESCALATION';
  type AbnormalCurrentStatus =
    | 'PENDING_REVIEW'
    | 'MANUAL_REVIEW'
    | 'RECHECKING'
    | 'IGNORED'
    | 'RESOLVED';
  type LogisticsStatus = 'PENDING' | 'ASSIGNED' | 'FAILED' | 'LABEL_CREATED';
  type WarehouseStatus = 'PENDING' | 'ASSIGNED' | 'FAILED' | 'LOCKED' | 'OUT_OF_STOCK';

  type PageParams = {
    current?: number;
    pageSize?: number;
    shopId?: string;
    shopName?: string;
    title?: string;
    orderNo?: string;
    status?: string;
    orderStatus?: string;
  };

  type OrderStatus = ShopeeOrderStatus;

  type PayStatus =
    | 'UNPAID'
    | 'PAID'
    | 'PART_REFUNDED'
    | 'REFUNDING'
    | 'REFUNDED';

  type AuditStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVERSED' | 'LOCKED';

  type DeliveryStatus =
    | 'PENDING'
    | 'READY_TO_SHIP'
    | 'PROCESSED'
    | 'SHIPPED'
    | 'TO_CONFIRM_RECEIVE'
    | 'RETRY_SHIP'
    | 'TO_RETURN'
    | 'CANCELLED';

  type AfterSaleStatus =
    | 'NONE'
    | 'IN_PROGRESS'
    | 'APPROVED'
    | 'REJECTED'
    | 'REFUNDING'
    | 'REFUNDED'
    | 'COMPLETED';

  type OrderExceptionTag =
    | 'ADDRESS_EXCEPTION'
    | 'OUT_OF_STOCK'
    | 'HIGH_RISK'
    | 'SYNC_FAILED'
    | 'BLACKLIST_BUYER'
    | 'TIMEOUT';

  type OrderExceptionStatus =
    | 'OPEN'
    | 'RECHECKING'
    | 'MANUAL_REVIEW'
    | 'IGNORED'
    | 'RESOLVED';

  type OrderLatestException = {
    id: string;
    exceptionType: string;
    status: OrderExceptionStatus;
    severity: RiskLevel;
    message?: string | null;
    source: string;
    createdAt: string;
    resolvedAt?: string | null;
  };

  type OrderStageHistoryItem = {
    id: string;
    fromStage?: string | null;
    toStage: string;
    trigger: string;
    action?: string | null;
    createdAt: string;
  };

  type OrderActionBinding = {
    actionKey: string;
    label: string;
    manager: string;
    method: string;
    endpoint: string;
    syncMode: PlatformSyncMode;
    available: boolean;
    reason?: string;
  };

  type OrderProcessingProfile = {
    platform: PlatformChannel;
    region: ShopeeRegionCode;
    shopId: string;
    platformStatus: ShopeeOrderStatus;
    orderManager: string;
    logisticsManager: string;
    returnsManager: string;
    primaryReadEndpoint: string;
    detailEndpoint: string;
    shipmentEndpoint: string;
    logisticsEndpoint: string;
    invoiceEndpoint?: string;
    returnsEndpoint: string;
    actionBindings: OrderActionBinding[];
  };

  type OrderSyncMeta = {
    lastSyncTime?: string;
    lastTriggerType?:
      | 'manual_detail'
      | 'manual_status'
      | 'sync_recent'
      | 'webhook'
      | 'invoice_add'
      | 'shipping_parameter'
      | 'shipping_parameter_mass'
      | 'ship'
      | 'ship_batch'
      | 'ship_mass'
      | 'tracking_sync'
      | 'tracking_sync_mass'
      | 'shipping_update';
    lastResult?: 'success' | 'partial' | 'failed';
    lastMessage?: string;
    detailSource: ShopeeDataSource;
    packageSource: ShopeeDataSource;
    paymentSource: ShopeeDataSource;
    invoiceSource: ShopeeDataSource;
    addressSource: ShopeeDataSource;
    statusSource: ShopeeDataSource;
    fallbackFields: string[];
  };

  type ShopeeSyncLogItem = {
    logId: string;
    triggerType:
      | 'manual_detail'
      | 'manual_status'
      | 'sync_recent'
      | 'webhook'
      | 'invoice_add'
      | 'shipping_parameter'
      | 'shipping_parameter_mass'
      | 'ship'
      | 'ship_batch'
      | 'ship_mass'
      | 'tracking_sync'
      | 'tracking_sync_mass'
      | 'shipping_update';
    shopId?: string;
    orderNo?: string;
    orderSn?: string;
    packageNumber?: string;
    requestPayloadSummary?: Record<string, unknown>;
    resultStatus: 'success' | 'partial' | 'failed';
    changedFields: string[];
    detailSource?: ShopeeDataSource | string;
    packageSource?: ShopeeDataSource | string;
    message?: string;
    createdAt: string;
  };

  type ListResponse<T> = API.ListResponse<T>;

  type ApiResponse<T> = {
    success: boolean;
    data: T;
    errorCode?: number;
    errorMessage?: string;
    showType?: number;
  };

  type ShopeeAuthUrlResponse = {
    url: string;
    redirectUrl: string;
    redisEnabled?: boolean;
  };

  type ShopListItem = {
    shopId: string;
    shopName: string;
    siteCode: string;
    channel: string;
    status: string;
    tokenExpireAt?: string | null;
    productCount?: number;
    orderCount?: number;
    updatedAt?: string;
  };

  type ShopSyncResult = {
    scope: 'shop' | 'products' | 'orders';
    shopId: string;
    tokenRefreshed?: boolean;
    productsSynced?: number;
    ordersSynced?: number;
  };

  type ProductListItem = {
    id?: string;
    productId?: string;
    platformProductId: string;
    title: string;
    status: string;
    localStatus?: string;
    shopId?: string;
    platformShopId?: string;
    itemId?: string;
    brand?: string;
    parentSku?: string;
    image?: string;
    skuCount?: number;
    modelCount?: number;
    stock: number;
    price: string;
    updatedAt?: string;
    createTime?: string;
    lastSyncTime?: string;
  };

  type ProductSavePayload = {
    shopId?: string;
    title: string;
    description?: string;
    categoryName?: string;
    brand?: string;
    parentSku?: string;
    currency?: string;
    price?: number;
    costPrice?: number;
    stock?: number;
    weightKg?: number;
    widthCm?: number;
    lengthCm?: number;
    heightCm?: number;
    defaultImageUrl?: string;
    sourceUrl?: string;
    skus?: Array<{
      skuCode: string;
      barcode?: string;
      optionName?: string;
      optionValue?: string;
      price?: number;
      costPrice?: number;
      stock?: number;
    }>;
  };

  type ProductOnlineUpdatePayload = {
    shopId: string;
    title?: string;
    description?: string;
    price?: number;
    stock?: number;
  };

  type SkuMappingQueryParams = PageParams & {
    shopId?: string;
  };

  type MissingSkuMappingItem = {
    shopId: string;
    orderSn: string;
    buyerUsername?: string;
    itemId: string;
    modelId?: string;
    platformSkuId?: string;
    platformSkuCode?: string;
    itemName?: string;
    modelName?: string;
    quantity: number;
    lastSeenAt: string;
  };

  type BindSkuMappingPayload = {
    shopId: string;
    itemId: string;
    modelId?: string;
    skuId: string;
    platformSkuId?: string;
    skuCode?: string;
  };

  type ErpSkuQueryParams = PageParams & {
    keyword?: string;
  };

  type ErpSkuListItem = {
    id: string;
    skuId: string;
    productId: string;
    productTitle: string;
    skuCode: string;
    barcode?: string | null;
    optionName?: string | null;
    optionValue?: string | null;
    status: string;
    price?: string;
    costPrice?: string;
    stock: number;
    updatedAt?: string;
  };

  type WarehouseListItem = {
    id: string;
    code: string;
    name: string;
    region?: string | null;
    address?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
  };

  type WarehouseSavePayload = {
    code: string;
    name: string;
    region?: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
    active?: boolean;
  };

  type InventoryQueryParams = PageParams & {
    warehouseId?: string;
    keyword?: string;
  };

  type InventoryBalanceItem = {
    id: string;
    warehouseId: string;
    warehouseCode: string;
    warehouseName: string;
    skuId: string;
    skuCode: string;
    barcode?: string | null;
    productId: string;
    productTitle: string;
    skuStock: number;
    onHand: number;
    locked: number;
    salable: number;
    safetyStock: number;
    updatedAt: string;
  };

  type InventoryAdjustPayload = {
    warehouseId: string;
    skuId: string;
    quantity: number;
    safetyStock?: number;
    movementType?: string;
    referenceType?: string;
    referenceId?: string;
    note?: string;
  };

  type InventoryReservePayload = {
    warehouseId: string;
    skuId: string;
    quantity: number;
    orderSn?: string;
    note?: string;
  };

  type InventoryReleasePayload = {
    reservationId: string;
    note?: string;
  };

  type SupplierQueryParams = {
    keyword?: string;
  };

  type SupplierListItem = {
    id: string;
    code: string;
    name: string;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    taxId?: string | null;
    currency: string;
    active: boolean;
    remark?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };

  type SupplierSavePayload = {
    code: string;
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    currency?: string;
    active?: boolean;
    remark?: string;
  };

  type PurchaseOrderStatus =
    | 'DRAFT'
    | 'SUBMITTED'
    | 'PARTIALLY_RECEIVED'
    | 'RECEIVED'
    | 'CANCELLED';

  type PurchaseOrderQueryParams = PageParams & {
    status?: string;
    supplierId?: string;
    warehouseId?: string;
    keyword?: string;
  };

  type PurchaseOrderListItem = {
    id: string;
    orderNo: string;
    supplierId: string;
    supplierName: string;
    warehouseId?: string | null;
    warehouseName?: string | null;
    status: PurchaseOrderStatus;
    currency: string;
    totalAmount?: string;
    itemCount: number;
    totalQuantity: number;
    receivedQuantity: number;
    expectedArriveAt?: string;
    submittedAt?: string;
    receivedAt?: string;
    remark?: string | null;
    createdAt: string;
    updatedAt: string;
  };

  type PurchaseOrderItem = {
    id: string;
    skuId: string;
    skuCode: string;
    productTitle: string;
    quantity: number;
    receivedQuantity: number;
    unitCost?: string;
    totalCost?: string;
    status: string;
    remark?: string | null;
  };

  type PurchaseOrderDetail = PurchaseOrderListItem & {
    items: PurchaseOrderItem[];
  };

  type PurchaseOrderSavePayload = {
    supplierId: string;
    warehouseId?: string;
    expectedArriveAt?: string;
    currency?: string;
    remark?: string;
    items: Array<{
      skuId: string;
      quantity: number;
      unitCost?: number;
      remark?: string;
    }>;
  };

  type PurchaseReceivePayload = {
    warehouseId: string;
    note?: string;
    items: Array<{
      itemId: string;
      quantity: number;
    }>;
  };

  type FinanceQueryParams = PageParams & {
    shopId?: string;
    keyword?: string;
    startDate?: string;
    endDate?: string;
  };

  type FinanceSummary = {
    orderCount: number;
    missingCostCount: number;
    revenue: string;
    productCost: string;
    platformFee: string;
    logisticsFee: string;
    otherFee: string;
    grossProfit: string;
    grossMarginRate?: string | null;
  };

  type OrderProfitItem = {
    id: string;
    shopId: string;
    orderSn: string;
    currency: string;
    revenue: string;
    productCost: string;
    platformFee: string;
    logisticsFee: string;
    otherFee: string;
    grossProfit: string;
    grossMarginRate?: string;
    estimated: boolean;
    missingCost: boolean;
    calculatedAt: string;
  };

  type FinanceRebuildPayload = {
    shopId?: string;
    limit?: number;
  };

  type FiscalDocumentType = 'NFE' | 'NFCE' | 'NFSE' | 'CTE' | 'MDFE' | 'DCE';

  type FiscalDocumentStatus =
    | 'DRAFT'
    | 'PROCESSING'
    | 'AUTHORIZED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'FAILED'
    | 'UNKNOWN';

  type FiscalHealth = {
    provider: 'NUVEM_FISCAL';
    environment: 'sandbox' | 'production';
    scopes: string[];
    credentialsConfigured: boolean;
  };

  type FiscalAddress = {
    cep: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    raw?: Record<string, unknown>;
  };

  type FiscalCompanyLookup = {
    cnpj: string;
    legalName?: string;
    tradeName?: string;
    status?: string;
    state?: string;
    city?: string;
    raw?: Record<string, unknown>;
  };

  type FiscalDocumentQueryParams = PageParams & {
    shopId?: string;
    orderSn?: string;
    type?: FiscalDocumentType;
    status?: FiscalDocumentStatus;
    keyword?: string;
    startDate?: string;
    endDate?: string;
  };

  type FiscalDocumentEvent = {
    id: string;
    eventType: string;
    status: string;
    errorMessage?: string | null;
    createdAt: string;
  };

  type FiscalDocumentItem = {
    id: string;
    provider: 'NUVEM_FISCAL';
    type: FiscalDocumentType;
    status: FiscalDocumentStatus;
    shopId: string;
    orderSn?: string | null;
    providerDocumentId?: string | null;
    accessKey?: string | null;
    number?: string | null;
    series?: string | null;
    issueDate?: string;
    totalAmount?: string;
    currency: string;
    xmlAvailable: boolean;
    pdfAvailable: boolean;
    lastSyncedAt?: string;
    errorMessage?: string | null;
    createdAt: string;
    updatedAt: string;
  };

  type FiscalDocumentDetail = FiscalDocumentItem & {
    events: FiscalDocumentEvent[];
  };

  type SystemPageParams = PageParams & {
    keyword?: string;
    status?: string;
  };

  type SystemPermissionItem = {
    code: string;
    module: string;
    action: string;
  };

  type SystemRoleItem = {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    permissions: string[];
    active: boolean;
    userCount?: number;
    createdAt?: string;
    updatedAt?: string;
  };

  type SystemRoleSavePayload = {
    code: string;
    name: string;
    description?: string;
    permissions: string[];
    active?: boolean;
  };

  type SystemUserItem = {
    id: string;
    username: string;
    displayName?: string | null;
    email?: string | null;
    active: boolean;
    roles: Array<{ id: string; code: string; name: string }>;
    createdAt?: string;
    updatedAt?: string;
  };

  type SystemUserSavePayload = {
    username: string;
    displayName?: string;
    email?: string;
    active?: boolean;
    roleIds?: string[];
  };

  type OperationLogQueryParams = SystemPageParams & {
    module?: string;
    action?: string;
  };

  type OperationLogItem = {
    id: string;
    module: string;
    action: string;
    status: string;
    resourceId?: string | null;
    shopId?: string | null;
    message?: string | null;
    operatorId?: string | null;
    actorName?: string | null;
    createdAt: string;
  };

  type TaskLogQueryParams = SystemPageParams & {
    queueName?: string;
  };

  type TaskLogItem = {
    id: string;
    queueName: string;
    jobName: string;
    status: string;
    errorMessage?: string | null;
    createdAt: string;
    updatedAt: string;
    processedAt?: string | null;
  };

  type MetabaseEmbedConfig = {
    enabled: boolean;
    siteUrl?: string;
    defaultDashboardId?: string;
  };

  type MetabaseEmbedOptions = {
    bordered?: boolean;
    titled?: boolean;
    theme?: 'light' | 'night';
    refreshSeconds?: number;
  };

  type MetabaseDashboardEmbedRequest = {
    dashboardId?: string;
    params?: Record<string, unknown>;
    options?: MetabaseEmbedOptions;
  };

  type MetabaseDashboardEmbedData = {
    url: string;
    dashboardId: string;
    expiresInSeconds: number;
    params: Record<string, unknown>;
    options: {
      bordered: boolean;
      titled: boolean;
      theme?: 'light' | 'night';
      refreshSeconds?: number;
    };
  };

  type RuleConfigItem = {
    id: string;
    ruleCode: string;
    ruleName: string;
    ruleType: RuleType;
    enabled: boolean;
    priority: number;
    hitTag: OrderExceptionTag;
    hitReason: string;
    hitScope: string;
    actionType: string;
    riskLevel: RiskLevel;
    suggestedAction: string;
    remark: string;
    hitOrderCount: number;
    createdAt: string;
    updatedAt: string;
  };

  type OrderListItem = {
    id: string;
    orderNo: string;
    platformOrderNo: string;
    orderSn: string;
    platform: string;
    platformChannel: PlatformChannel;
    platformRegion: ShopeeRegionCode;
    platformShopId: string;
    platformStatus: ShopeeOrderStatus;
    fulfillmentStage: FulfillmentStage;
    fulfillmentStageDescription: string;
    nextActionSuggestion: string;
    branchReason?: string;
    statusTrail: OrderStatus[];
    shopName: string;
    buyerName: string;
    buyerUserId: string;
    messageToSeller: string;
    items: string;
    skuCount: number;
    totalAmount: string;
    currency: string;
    createTime: string;
    updateTime: string;
    shipByDate: string;
    daysToShip: number;
    estimatedShippingFee: string;
    actualShippingFee: string;
    paymentMethod: string;
    shippingCarrier: string;
    checkoutShippingCarrier: string;
    reverseShippingFee: string;
    orderChargeableWeightGram: number;
    pendingTerms: string[];
    fulfillmentFlag: string;
    buyerCpfId?: string;
    buyerCnpjId?: string;
    cancelBy?: string;
    cancelReason?: string;
    buyerCancelReason?: string;
    packageNumber: string;
    packageCount: number;
    packageStatus: ShopeePackageStatus;
    packageFulfillmentStatus: string;
    packageList: ShopeePackageInfo[];
    lastSyncTime?: string;
    syncMeta: OrderSyncMeta;
    infoNeeded: ShopeeShippingInfoNeeded[];
    pickupDoneTime?: string;
    edtFrom?: string;
    edtTo?: string;
    returnRequestDueDate?: string;
    orderStatus: OrderStatus;
    payStatus: PayStatus;
    auditStatus: AuditStatus;
    deliveryStatus: DeliveryStatus;
    afterSaleStatus: AfterSaleStatus;
    warehouseName: string;
    logisticsCompany: string;
    trackingNo: string;
    tags: OrderExceptionTag[];
    exceptionType?: string;
    latestException?: OrderLatestException;
    stageHistory?: OrderStageHistoryItem[];
    exceptionTags: OrderExceptionTag[];
    hitRuleCodes: string[];
    hitRuleNames: string[];
    exceptionReason: string;
    riskLevel: RiskLevel;
    suggestedAction: string;
    currentStatus: AbnormalCurrentStatus;
    orderTime: string;
    remark: string;
    locked: boolean;
    logisticsStatus: ShopeeLogisticsStatus;
    logisticsChannel: string;
    logisticsAssignedAt?: string;
    dispatchRecommendation: string;
    deliveryAging: number;
    freightEstimate: string;
    warehouseStatus: WarehouseStatus;
    warehouseAssignedAt?: string;
    allocationStrategy: string;
    allocationReason: string;
    stockWarning: string;
    stockSufficient: boolean;
    recommendedWarehouse: string;
    processingProfile: OrderProcessingProfile;
  };

  type OrderItemSku = {
    skuId: string;
    skuName: string;
    quantity: number;
    unitPrice: string;
    image: string;
    attributes: string[];
  };

  type ShopeePackageItem = {
    itemId: string;
    modelId: string;
    modelQuantity: number;
    orderItemId: string;
    productLocationId: string;
  };

  type ShopeePackageInfo = {
    orderSn?: string;
    packageNumber: string;
    packageStatus: ShopeePackageStatus;
    packageFulfillmentStatus: string;
    fulfillmentStatus: string;
    logisticsStatus: ShopeeLogisticsStatus;
    shippingCarrier: string;
    logisticsChannelId: number;
    logisticsChannelName?: string;
    serviceCode?: string;
    shippingDocumentStatus?: string;
    shippingDocumentType?: string;
    documentUrl?: string;
    downloadRef?: Record<string, unknown>;
    logisticsProfile?: 'SHOPEE_XPRESS' | 'DIRECT_DELIVERY' | 'OTHER';
    trackingNumber?: string;
    allowSelfDesignAwb: boolean;
    infoNeeded: ShopeeShippingInfoNeeded[];
    parcelItemCount: number;
    itemCount: number;
    latestPackageUpdateTime: string;
    lastDocumentSyncTime?: string;
    dataSource: ShopeeDataSource;
    realFieldList: string[];
    shipByDate: string;
    updateTime: string;
    pickupDoneTime?: string;
    itemList: ShopeePackageItem[];
  };

  type ShopeeChannelStrategy = {
    profile: 'SHOPEE_XPRESS' | 'DIRECT_DELIVERY' | 'OTHER';
    packageKeyMode: 'PACKAGE_NUMBER';
    supportsSingle: boolean;
    supportsBatch: boolean;
    supportsMass: boolean;
    prefersMass: boolean;
    updateMode: 'pickup_only';
    notes: string[];
  };

  type ShopeeShippingInfoNeededMap = {
    pickup: string[];
    dropoff: string[];
    nonIntegrated: string[];
  };

  type ShopeeShippingParameterResult = {
    shopId: string;
    orderNo?: string;
    orderSn: string;
    packageNumber: string;
    logisticsProfile: 'SHOPEE_XPRESS' | 'DIRECT_DELIVERY' | 'OTHER';
    logisticsChannelId?: number;
    logisticsChannelName?: string;
    serviceCode?: string;
    shippingMode: 'pickup' | 'dropoff' | 'non_integrated' | 'unknown';
    infoNeeded: ShopeeShippingInfoNeededMap;
    canShip: boolean;
    missingPreconditions: string[];
    pickup?: Record<string, unknown>;
    dropoff?: Record<string, unknown>;
    nonIntegrated?: Record<string, unknown>;
    parameterSource: string;
    checkedAt: string;
    channelStrategy: ShopeeChannelStrategy;
    raw?: Record<string, unknown> | null;
  };

  type ShopeeMassShippingParameterGroup = {
    groupKey: string;
    shopId: string;
    logisticsProfile: 'SHOPEE_XPRESS' | 'DIRECT_DELIVERY' | 'OTHER';
    logisticsChannelId?: number;
    productLocationId?: string;
    successList: Array<{ packageNumber?: string }>;
    failList: Array<{ packageNumber?: string; failReason?: string }>;
    infoNeeded: ShopeeShippingInfoNeededMap;
    pickup?: Record<string, unknown>;
    dropoff?: Record<string, unknown>;
    nonIntegrated?: Record<string, unknown>;
    canShip: boolean;
    missingPreconditions: string[];
    parameterSource: string;
    channelStrategy: ShopeeChannelStrategy;
    checkedAt: string;
    raw?: Record<string, unknown>;
  };

  type ShopeeTrackingSyncItem = {
    packageNumber?: string;
    trackingNumber?: string;
    plpNumber?: string;
    firstMileTrackingNumber?: string;
    lastMileTrackingNumber?: string;
    hint?: string;
    pickupCode?: string;
    failReason?: string;
  };

  type PackageGateStatus = {
    pass: boolean;
    reasons: string[];
  };

  type PackagePrecheckGateSet = {
    invoiceGate: PackageGateStatus;
    packageGate: PackageGateStatus;
    documentGate: PackageGateStatus;
    shippingParameterGate: PackageGateStatus;
    channelStrategyGate: PackageGateStatus;
  };

  type PackageSyncSummary = {
    triggerType: ShopeeSyncLogItem['triggerType'];
    resultStatus: ShopeeSyncLogItem['resultStatus'];
    message?: string | null;
    createdAt: string;
    changedFields: string[];
    requestPayloadSummary?: Record<string, unknown> | null;
  };

  type PackagePrecheckItem = {
    id: string;
    orderId: string;
    packageNumber: string;
    orderNo: string;
    orderSn: string;
    shopId: string;
    shopName: string;
    orderStatus: OrderStatus;
    logisticsProfile: 'SHOPEE_XPRESS' | 'DIRECT_DELIVERY' | 'OTHER';
    logisticsChannelId?: number;
    logisticsChannelName?: string;
    shippingCarrier: string;
    serviceCode?: string;
    trackingNumber?: string;
    packageStatus: ShopeePackageStatus;
    logisticsStatus: ShopeeLogisticsStatus;
    shippingDocumentStatus?: string;
    shippingDocumentType?: string;
    lastDocumentSyncTime?: string | null;
    canShip: boolean;
    missingPreconditions: string[];
    gates: PackagePrecheckGateSet;
    channelStrategy: {
      logisticsProfile: 'SHOPEE_XPRESS' | 'DIRECT_DELIVERY' | 'OTHER';
      prefersMass: boolean;
      supportsMass: boolean;
      supportsPickupUpdate: boolean;
      supportsShippingDocument: boolean;
      parameterNotes: string[];
    };
    latestSyncSummary?: PackageSyncSummary | null;
    latestPrecheckSummary?: PackageSyncSummary | null;
    sourceSummary: {
      packageSource: ShopeeDataSource | 'DB_RAW_JSON';
      rawFragment: boolean;
      sourceRaw: boolean;
      lastSyncTime?: string | null;
      latestPackageUpdateTime?: string | null;
    };
    commonFailureReasons: string[];
    precheckSource: string;
    updatedAt: string;
    lastSyncTime?: string | null;
  };

  type PackagePrecheckQueryParams = PageParams & {
    packageNumber?: string;
    orderSn?: string;
    logisticsProfile?: 'SHOPEE_XPRESS' | 'DIRECT_DELIVERY' | 'OTHER';
    logisticsChannelId?: number | string;
    logisticsChannelName?: string;
    shippingCarrier?: string;
    packageStatus?: ShopeePackageStatus;
    logisticsStatus?: ShopeeLogisticsStatus;
    shippingDocumentStatus?: string;
    canShip?: 'true' | 'false';
    startTime?: string;
    endTime?: string;
    timeField?: 'updatedAt' | 'lastSyncTime';
  };

  type AddressInfo = {
    receiverName: string;
    receiverPhone: string;
    country: string;
    countryCode?: string;
    state: string;
    city: string;
    district: string;
    addressLine1: string;
    addressLine2?: string;
    zipCode: string;
    fullAddress?: string;
    recipientTaxId?: string;
    recipientTaxIdType?: 'CPF' | 'CNPJ';
  };

  type PaymentInfo = {
    method: string;
    transactionNo: string;
    paidAt: string;
    payAmount: string;
    currency: string;
  };

  type ShopeePaymentInfo = {
    paymentMethod: string;
    paymentProcessorRegister: string;
    cardBrand: string;
    transactionId: string;
    paymentAmount: string;
  };

  type InvoiceInfo = {
    number: string;
    seriesNumber: string;
    accessKey: string;
    issueDate: string;
    totalValue: string;
    productsTotalValue: string;
    taxCode: string;
  };

  type LogisticsInfo = {
    logisticsCompany: string;
    logisticsService: string;
    logisticsChannel: string;
    logisticsChannelId?: number;
    serviceCode?: string;
    shippingDocumentStatus?: string;
    shippingDocumentType?: string;
    lastDocumentSyncTime?: string;
    logisticsProfile?: 'SHOPEE_XPRESS' | 'DIRECT_DELIVERY' | 'OTHER';
    trackingNo: string;
    packageNumber: string;
    packageStatus: ShopeePackageStatus;
    fulfillmentStatus: string;
    warehouseName: string;
    shippedAt?: string;
    deliveryStatus: DeliveryStatus;
    logisticsStatus: ShopeeLogisticsStatus;
    dispatchRecommendation: string;
    freightEstimate: string;
    infoNeeded: ShopeeShippingInfoNeeded[];
  };

  type OrderLogItem = {
    id: string;
    orderNo: string;
    operator: string;
    action: string;
    detail: string;
    createdAt: string;
    module: string;
  };

  type OrderDetail = OrderListItem & {
    platform: string;
    shopId: string;
    buyerEmail: string;
    buyerNote: string;
    sellerNote: string;
    paymentInfo: PaymentInfo;
    paymentInfoList: ShopeePaymentInfo[];
    invoiceInfo?: InvoiceInfo;
    addressInfo: AddressInfo;
    logisticsInfo: LogisticsInfo;
    itemList: OrderItemSku[];
    operationLogs: OrderLogItem[];
  };

  type AfterSaleItem = {
    id: string;
    sourceOrderId: string;
    orderNo: string;
    afterSaleNo: string;
    platform: string;
    platformChannel: PlatformChannel;
    platformRegion: ShopeeRegionCode;
    platformStatus: ShopeeOrderStatus;
    buyerName: string;
    shopName: string;
    type: string;
    reason: string;
    status: AfterSaleStatus;
    amount: string;
    createdAt: string;
    updatedAt: string;
    processingProfile: OrderProcessingProfile;
  };

  type OrderQueryParams = PageParams & {
    orderNo?: string;
    platformOrderNo?: string;
    shopName?: string;
    buyerName?: string;
    sku?: string;
    orderTime?: string[];
    orderStatus?: OrderStatus;
    payStatus?: PayStatus;
    deliveryStatus?: DeliveryStatus;
    warehouseName?: string;
    logisticsCompany?: string;
    logisticsStatus?: ShopeeLogisticsStatus;
    warehouseStatus?: WarehouseStatus;
    logisticsChannel?: string;
    packageNumber?: string;
    shippingDocumentStatus?: string;
    shippingDocumentType?: string;
    platformStatus?: ShopeeOrderStatus;
    packageStatus?: ShopeePackageStatus;
    packageFulfillmentStatus?: string;
    fulfillmentFlag?: string;
    cancelBy?: string;
    ruleCode?: string;
    ruleType?: RuleType;
    riskLevel?: RiskLevel;
    suggestedAction?: string;
    exceptionTag?: OrderExceptionTag;
    exceptionType?: string;
    exceptionStatus?: OrderExceptionStatus;
    hasActiveException?: boolean;
    hitRuleCode?: string;
    exceptionReason?: string;
    currentStatus?: AbnormalCurrentStatus;
    status?: string;
    currentTab?: string;
    sorter?: Record<string, SortOrder>;
    startTime?: string;
    endTime?: string;
  };

  type OrderLogQueryParams = PageParams & {
    orderNo?: string;
    operator?: string;
    module?: string;
  };

  type ShopeeSyncLogQueryParams = PageParams & {
    orderNo?: string;
    orderSn?: string;
    packageNumber?: string;
    shopId?: string;
    triggerType?:
      | 'manual_detail'
      | 'manual_status'
      | 'sync_recent'
      | 'webhook'
      | 'invoice_add'
      | 'shipping_parameter'
      | 'shipping_parameter_mass'
      | 'ship'
      | 'ship_batch'
      | 'ship_mass'
      | 'tracking_sync'
      | 'tracking_sync_mass'
      | 'shipping_update';
    resultStatus?: 'success' | 'partial' | 'failed';
    startTime?: string;
    endTime?: string;
  };

  type RuleQueryParams = PageParams & {
    ruleName?: string;
    ruleCode?: string;
    ruleType?: RuleType;
    hitTag?: OrderExceptionTag;
    riskLevel?: RiskLevel;
    enabled?: boolean;
  };

  type OrderOperationPayload = {
    orderIds?: string[];
    orders?: Array<{
      shopId: string;
      orderSn: string;
      packageNumber?: string;
      shippingDocumentType?: string;
    }>;
    orderId?: string;
    orderNo?: string;
    orderSn?: string;
    orderNos?: string[];
    shopId?: string;
    packageNumber?: string;
    packageNumbers?: string[];
    shippingDocumentType?: string;
    invoiceData?: Partial<InvoiceInfo> & {
      issueDate?: string;
      totalValue?: string;
      productsTotalValue?: string;
    };
    remark?: string;
    addressInfo?: AddressInfo;
    warehouseName?: string;
    logisticsCompany?: string;
    logisticsService?: string;
    logisticsChannel?: string;
    trackingNo?: string;
    responseOptionalFields?: string;
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
      trackingList?: Array<{
        packageNumber: string;
        trackingNumber: string;
      }>;
    };
    logisticsChannelId?: number;
    productLocationId?: string;
    reason?: string;
    tags?: OrderExceptionTag[];
    currentStatus?: AbnormalCurrentStatus;
  };

  type RuleSavePayload = {
    id?: string;
    ruleCode: string;
    ruleName: string;
    ruleType: RuleType;
    enabled: boolean;
    priority: number;
    hitTag: OrderExceptionTag;
    hitReason: string;
    hitScope: string;
    actionType: string;
    riskLevel: RiskLevel;
    suggestedAction: string;
    remark: string;
  };

  type OrderOverview = {
    total: number;
    pendingCount: number;
    pendingInvoiceCount: number;
    abnormalCount: number;
    shippedCount: number;
    cancelRefundCount: number;
    lockedCount: number;
    printPendingCount: number;
    logisticsPendingCount: number;
    warehousePendingCount: number;
    unpaidCount: number;
    readyToShipCount: number;
    processedCount: number;
    toConfirmReceiveCount: number;
    inCancelCount: number;
    retryShipCount: number;
    toReturnCount: number;
    cancelledCount: number;
    completedCount: number;
  };
}
