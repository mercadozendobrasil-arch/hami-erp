import dayjs from 'dayjs';
import {
  getBranchReason,
  getDeliveryStatusByOrderStatus,
  getFulfillmentStage,
  getFulfillmentStageDescription,
  getInfoNeededByOrderStatus,
  getNextActionSuggestion,
  getPackageFulfillmentStatusByOrderStatus,
  getPackageStatusByOrderStatus,
  getShopeeLogisticsStatusByOrderStatus,
  getStatusTrail,
} from './orderFlow';
import { ensureOrderPlatformProfile } from './orderPlatform';

export type RawOrderRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawOrderRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): RawOrderRecord {
  return isRecord(value) ? value : {};
}

function readPath(source: RawOrderRecord, path: string): unknown {
  if (path in source) {
    return source[path];
  }

  return path.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }
    return current[segment];
  }, source);
}

function pickValue(record: RawOrderRecord, paths: string[]) {
  const raw = toRecord(record.rawJson);
  for (const path of paths) {
    const direct = readPath(record, path);
    if (direct !== undefined && direct !== null && direct !== '') {
      return direct;
    }
    const nested = readPath(raw, path);
    if (nested !== undefined && nested !== null && nested !== '') {
      return nested;
    }
  }
  return undefined;
}

function toStringValue(record: RawOrderRecord, paths: string[], fallback = '-') {
  const value = pickValue(record, paths);
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return fallback;
}

function toOptionalString(record: RawOrderRecord, paths: string[]) {
  const value = pickValue(record, paths);
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return undefined;
}

function toOptionalNumber(record: RawOrderRecord, paths: string[]) {
  const value = pickValue(record, paths);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function toArrayValue(record: RawOrderRecord, paths: string[]) {
  const value = pickValue(record, paths);
  return Array.isArray(value) ? value : [];
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item : ''))
    .filter((item) => Boolean(item));
}

function hasPath(source: RawOrderRecord, path: string): boolean {
  const segments = path.split('.');
  let current: unknown = source;

  for (const segment of segments) {
    if (!isRecord(current)) {
      return false;
    }
    if (!(segment in current)) {
      return false;
    }
    current = current[segment];
  }

  return true;
}

function hasAnyPath(source: RawOrderRecord, paths: string[]) {
  return paths.some((path) => hasPath(source, path));
}

function formatDateTime(value: unknown, fallback?: string) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const timestamp = value > 1e12 ? value : value * 1000;
    return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
  }
  if (typeof value === 'string' && value.trim()) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && /^\d+$/.test(value.trim())) {
      const timestamp = numberValue > 1e12 ? numberValue : numberValue * 1000;
      return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
    }
    const parsed = dayjs(value);
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD HH:mm:ss');
    }
  }
  return fallback !== undefined ? fallback : '-';
}

function formatOptionalDateTime(value: unknown) {
  const formatted = formatDateTime(value, '');
  return formatted || undefined;
}

function normalizeDataSource(value: unknown, fallback: ERP.ShopeeDataSource): ERP.ShopeeDataSource {
  switch (String(value || '')) {
    case 'REALTIME_SYNCED':
      return 'REALTIME_SYNCED';
    case 'DB_RAW_JSON':
      return 'DB_RAW_JSON';
    case 'FALLBACK':
      return 'FALLBACK';
    default:
      return fallback;
  }
}

function normalizeSyncMeta(
  record: RawOrderRecord,
  hasRealPackageList: boolean,
  updateTime: string,
): ERP.OrderSyncMeta {
  const meta = toRecord(pickValue(record, ['sync_meta', '_sync_meta']));
  const fallbackFields = toStringArray(
    pickValue(meta, ['fallback_fields', 'fallbackFields']),
  );
  const hasPaymentField = hasAnyPath(record, [
    'payment_info',
    'paymentInfo',
    'payment_info_list',
    'paymentInfoList',
  ]);
  const hasInvoiceField = hasAnyPath(record, [
    'invoice_data',
    'invoiceInfo',
    'invoice_data_info',
  ]);
  const hasAddressField = hasAnyPath(record, ['recipient_address', 'recipientAddress']);
  const hasStatusField = hasAnyPath(record, ['order_status', 'orderStatus']);

  return {
    lastSyncTime:
      formatOptionalDateTime(
        pickValue(meta, ['last_sync_time', 'lastSyncTime']),
      ) || updateTime,
    lastTriggerType:
      (pickValue(meta, ['last_trigger_type', 'lastTriggerType']) as ERP.OrderSyncMeta['lastTriggerType']) ||
      'sync_recent',
    lastResult:
      (pickValue(meta, ['last_result', 'lastResult']) as ERP.OrderSyncMeta['lastResult']) ||
      'success',
    lastMessage: toOptionalString(meta, ['last_message', 'lastMessage']),
    detailSource: normalizeDataSource(
      pickValue(meta, ['detail_source', 'detailSource']),
      hasRealPackageList ? 'DB_RAW_JSON' : 'FALLBACK',
    ),
    packageSource: normalizeDataSource(
      pickValue(meta, ['package_source', 'packageSource']),
      hasRealPackageList ? 'DB_RAW_JSON' : 'FALLBACK',
    ),
    paymentSource: normalizeDataSource(
      pickValue(meta, ['payment_source', 'paymentSource']),
      hasPaymentField ? 'DB_RAW_JSON' : 'FALLBACK',
    ),
    invoiceSource: normalizeDataSource(
      pickValue(meta, ['invoice_source', 'invoiceSource']),
      hasInvoiceField ? 'DB_RAW_JSON' : 'FALLBACK',
    ),
    addressSource: normalizeDataSource(
      pickValue(meta, ['address_source', 'addressSource']),
      hasAddressField ? 'DB_RAW_JSON' : 'FALLBACK',
    ),
    statusSource: normalizeDataSource(
      pickValue(meta, ['status_source', 'statusSource']),
      hasStatusField ? 'DB_RAW_JSON' : 'FALLBACK',
    ),
    fallbackFields,
  };
}

function formatMoneyValue(value: unknown, fallback = '0.00') {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed.toFixed(2);
    }
  }
  return fallback;
}

function mapBackendOrderStatus(value: unknown): ERP.OrderStatus {
  const normalized = String(value || 'READY_TO_SHIP').toUpperCase();
  switch (normalized) {
    case 'UNPAID':
    case 'PENDING_INVOICE':
    case 'READY_TO_SHIP':
    case 'PROCESSED':
    case 'SHIPPED':
    case 'TO_CONFIRM_RECEIVE':
    case 'COMPLETED':
    case 'IN_CANCEL':
    case 'CANCELLED':
    case 'RETRY_SHIP':
    case 'TO_RETURN':
      return normalized;
    case 'INVOICE_PENDING':
      return 'PENDING_INVOICE';
    default:
      return 'READY_TO_SHIP';
  }
}

function mapRawLogisticsStatus(value: unknown, orderStatus: ERP.OrderStatus): ERP.ShopeeLogisticsStatus {
  const normalized = String(value || '').toUpperCase();
  switch (normalized) {
    case 'LOGISTICS_NOT_STARTED':
    case 'LOGISTICS_NOT_START':
      return 'LOGISTICS_NOT_START';
    case 'LOGISTICS_REQUEST_CREATED':
    case 'LOGISTICS_PICKUP_DONE':
    case 'LOGISTICS_PICKUP_RETRY':
    case 'LOGISTICS_PICKUP_FAILED':
    case 'LOGISTICS_DELIVERY_DONE':
    case 'LOGISTICS_DELIVERY_FAILED':
    case 'LOGISTICS_REQUEST_CANCELED':
    case 'LOGISTICS_COD_REJECTED':
    case 'LOGISTICS_READY':
    case 'LOGISTICS_INVALID':
    case 'LOGISTICS_LOST':
    case 'LOGISTICS_PENDING_ARRANGE':
      return normalized as ERP.ShopeeLogisticsStatus;
    default:
      return getShopeeLogisticsStatusByOrderStatus(orderStatus);
  }
}

function mapRawPackageStatus(value: unknown, orderStatus: ERP.OrderStatus): ERP.ShopeePackageStatus {
  if (typeof value === 'number') {
    if (value === 1) return 'PENDING';
    if (value === 2) return 'TO_PROCESS';
    if (value === 3) return 'PROCESSED';
  }

  const normalized = String(value || '').toUpperCase();
  switch (normalized) {
    case 'PENDING':
    case 'TO_PROCESS':
    case 'PROCESSED':
      return normalized;
    default:
      return getPackageStatusByOrderStatus(orderStatus);
  }
}

function deriveLogisticsProfile(input: {
  shippingCarrier?: string;
  logisticsChannelId?: number;
}) {
  const carrier = String(input.shippingCarrier || '').toUpperCase();
  const channelId = Number(input.logisticsChannelId || 0);

  if (
    channelId === 30029 ||
    carrier.includes('SHOPEE XPRESS') ||
    carrier.includes('SPX')
  ) {
    return 'SHOPEE_XPRESS' as const;
  }

  if (
    channelId === 90022 ||
    carrier.includes('ENTREGA DIRETA') ||
    carrier.includes('DIRECT DELIVERY')
  ) {
    return 'DIRECT_DELIVERY' as const;
  }

  return 'OTHER' as const;
}

function buildFallbackPackageList(
  orderStatus: ERP.OrderStatus,
  orderSn: string,
  updateTime: string,
  shipByDate: string,
  trackingNumber?: string,
  shippingCarrier?: string,
): ERP.ShopeePackageInfo[] {
  const packageFulfillmentStatus = getPackageFulfillmentStatusByOrderStatus(orderStatus);
  const logisticsStatus = getShopeeLogisticsStatusByOrderStatus(orderStatus);
  const packageNumber = `${orderSn}-PKG1`;

  return [
    {
      orderSn,
      packageNumber,
      packageStatus: getPackageStatusByOrderStatus(orderStatus),
      packageFulfillmentStatus,
      fulfillmentStatus: packageFulfillmentStatus,
      logisticsStatus,
      shippingCarrier: shippingCarrier || '-',
      logisticsChannelId: 0,
      logisticsChannelName: undefined,
      serviceCode: undefined,
      shippingDocumentStatus: undefined,
      shippingDocumentType: undefined,
      documentUrl: undefined,
      downloadRef: undefined,
      logisticsProfile: deriveLogisticsProfile({
        shippingCarrier,
        logisticsChannelId: 0,
      }),
      trackingNumber,
      allowSelfDesignAwb: orderStatus !== 'UNPAID',
      infoNeeded: getInfoNeededByOrderStatus(orderStatus),
      parcelItemCount: 0,
      itemCount: 0,
      latestPackageUpdateTime: updateTime,
      lastDocumentSyncTime: undefined,
      dataSource: 'FALLBACK',
      realFieldList: [],
      shipByDate,
      updateTime,
      pickupDoneTime: ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'].includes(orderStatus)
        ? updateTime
        : undefined,
      itemList: [],
    },
  ];
}

function normalizePackageItem(item: unknown): ERP.ShopeePackageItem | null {
  const record = toRecord(item);
  const itemId = toOptionalString(record, ['item_id', 'itemId']);
  const modelId = toOptionalString(record, ['model_id', 'modelId']);
  const orderItemId = toOptionalString(record, ['order_item_id', 'orderItemId']);

  if (!itemId && !orderItemId) {
    return null;
  }

  return {
    itemId: itemId || '-',
    modelId: modelId || '-',
    modelQuantity: toOptionalNumber(record, ['model_quantity', 'modelQuantity']) || 0,
    orderItemId: orderItemId || '-',
    productLocationId: toOptionalString(record, ['product_location_id', 'productLocationId']) || '-',
  };
}

function normalizePackageList(
  record: RawOrderRecord,
  orderStatus: ERP.OrderStatus,
  orderSn: string,
  updateTime: string,
  shipByDate: string,
  orderTrackingNumber?: string,
  orderShippingCarrier?: string,
) {
  const rawPackages = toArrayValue(record, ['package_list', 'packageList']);
  if (!rawPackages.length) {
    return buildFallbackPackageList(
      orderStatus,
      orderSn,
      updateTime,
      shipByDate,
      orderTrackingNumber,
      orderShippingCarrier,
    );
  }

  return rawPackages.map((item, index) => {
    const pkg = toRecord(item);
    const itemList = toArrayValue(pkg, ['item_list', 'itemList'])
      .map((packageItem) => normalizePackageItem(packageItem))
      .filter((packageItem): packageItem is ERP.ShopeePackageItem => Boolean(packageItem));
    const packageFulfillmentStatus =
      toOptionalString(pkg, ['fulfillment_status', 'packageFulfillmentStatus', 'fulfillmentStatus']) ||
      getPackageFulfillmentStatusByOrderStatus(orderStatus);
    const latestPackageUpdateTime = formatDateTime(
      pickValue(pkg, ['update_time', 'latestPackageUpdateTime', 'updateTime']),
      updateTime,
    );
    const trackingNumber =
      toOptionalString(pkg, ['tracking_number', 'trackingNumber']) ||
      (index === 0 ? orderTrackingNumber : undefined);
    const logisticsChannelId =
      toOptionalNumber(pkg, ['logistics_channel_id', 'logisticsChannelId']) || 0;
    const shippingCarrier =
      toOptionalString(pkg, ['shipping_carrier', 'shippingCarrier']) || orderShippingCarrier || '-';

    return {
      orderSn,
      packageNumber:
        toOptionalString(pkg, ['package_number', 'packageNumber']) || `${orderSn}-PKG${index + 1}`,
      packageStatus: mapRawPackageStatus(
        pickValue(pkg, ['package_status', 'packageStatus']),
        orderStatus,
      ),
      packageFulfillmentStatus,
      fulfillmentStatus: packageFulfillmentStatus,
      logisticsStatus: mapRawLogisticsStatus(
        pickValue(pkg, ['logistics_status', 'logisticsStatus']),
        orderStatus,
      ),
      shippingCarrier,
      logisticsChannelId,
      logisticsChannelName:
        toOptionalString(pkg, [
          'logistics_channel_name',
          'logisticsChannelName',
          'channel_name',
          'channelName',
        ]) ||
        toOptionalString(record, ['checkout_shipping_carrier', 'checkoutShippingCarrier']),
      serviceCode: toOptionalString(pkg, ['service_code', 'serviceCode']),
      shippingDocumentStatus: toOptionalString(pkg, [
        'shipping_document_status',
        'shippingDocumentStatus',
      ]),
      shippingDocumentType: toOptionalString(pkg, [
        'shipping_document_type',
        'shippingDocumentType',
      ]),
      documentUrl: toOptionalString(pkg, ['document_url', 'documentUrl']),
      downloadRef: (() => {
        const value = pickValue(pkg, ['download_ref', 'downloadRef']);
        return value && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : undefined;
      })(),
      logisticsProfile: deriveLogisticsProfile({
        shippingCarrier,
        logisticsChannelId,
      }),
      trackingNumber,
      allowSelfDesignAwb: Boolean(
        pickValue(pkg, ['allow_self_design_awb', 'allowSelfDesignAwb']) ?? orderStatus !== 'UNPAID',
      ),
      infoNeeded: toStringArray(pickValue(pkg, ['info_needed', 'infoNeeded'])).length
        ? (toStringArray(pickValue(pkg, ['info_needed', 'infoNeeded'])) as ERP.ShopeeShippingInfoNeeded[])
        : getInfoNeededByOrderStatus(orderStatus),
      parcelItemCount:
        toOptionalNumber(pkg, ['parcel_item_count', 'parcelItemCount', 'item_count', 'itemCount']) ||
        itemList.reduce((total, packageItem) => total + packageItem.modelQuantity, 0),
      itemCount:
        toOptionalNumber(pkg, ['item_count', 'itemCount', 'parcel_item_count', 'parcelItemCount']) ||
        itemList.reduce((total, packageItem) => total + packageItem.modelQuantity, 0),
      latestPackageUpdateTime,
      lastDocumentSyncTime: formatOptionalDateTime(
        pickValue(pkg, ['last_document_sync_time', 'lastDocumentSyncTime']),
      ),
      dataSource: normalizeDataSource(
        pickValue(pkg, ['_source', 'dataSource']),
        'DB_RAW_JSON',
      ),
      realFieldList: toStringArray(pickValue(pkg, ['_real_fields', 'realFieldList'])),
      shipByDate: formatDateTime(pickValue(pkg, ['ship_by_date', 'shipByDate']), shipByDate),
      updateTime: latestPackageUpdateTime,
      pickupDoneTime: formatOptionalDateTime(
        pickValue(pkg, ['pickup_done_time', 'pickupDoneTime']),
      ),
      itemList,
    };
  });
}

function normalizeAddressInfo(record: RawOrderRecord, buyerDocument?: string): ERP.AddressInfo {
  const recipient = toRecord(pickValue(record, ['recipient_address', 'recipientAddress']));
  const fullAddress =
    toOptionalString(recipient, ['full_address', 'fullAddress']) ||
    [toOptionalString(recipient, ['address_line_1', 'addressLine1']), toOptionalString(recipient, ['address_line_2', 'addressLine2'])]
      .filter((item): item is string => Boolean(item))
      .join(', ');

  return {
    receiverName:
      toOptionalString(recipient, ['name', 'receiverName', 'recipientName']) ||
      toStringValue(record, ['buyer_username', 'buyerName'], '-'),
    receiverPhone:
      toOptionalString(recipient, ['phone', 'receiverPhone', 'recipientPhone']) || '-',
    country:
      toOptionalString(recipient, ['country', 'country_name']) ||
      (toOptionalString(recipient, ['region']) === 'BR' ? 'Brazil' : 'Brazil'),
    countryCode: toOptionalString(recipient, ['country_code', 'countryCode', 'region']) || 'BR',
    state: toOptionalString(recipient, ['state']) || '-',
    city: toOptionalString(recipient, ['city']) || '-',
    district: toOptionalString(recipient, ['district', 'town']) || '-',
    addressLine1:
      toOptionalString(recipient, ['address_line_1', 'addressLine1']) || fullAddress || '-',
    addressLine2:
      toOptionalString(recipient, ['address_line_2', 'addressLine2']) ||
      toOptionalString(recipient, ['town']),
    zipCode: toOptionalString(recipient, ['zipcode', 'zip_code', 'zipCode']) || '-',
    fullAddress,
    recipientTaxId: buyerDocument,
    recipientTaxIdType: buyerDocument?.length === 14 ? 'CNPJ' : buyerDocument ? 'CPF' : undefined,
  };
}

function normalizePaymentInfoList(record: RawOrderRecord) {
  return toArrayValue(record, ['payment_info', 'paymentInfo', 'payment_info_list', 'paymentInfoList'])
    .map((item) => {
      const payment = toRecord(item);
      const transactionId = toOptionalString(payment, ['transaction_id', 'transactionId']);
      if (!transactionId) {
        return null;
      }

      return {
        paymentMethod:
          toOptionalString(payment, ['payment_method', 'paymentMethod']) ||
          toStringValue(record, ['payment_method', 'paymentMethod'], '-'),
        paymentProcessorRegister:
          toOptionalString(payment, ['payment_processor_register', 'paymentProcessorRegister']) || '-',
        cardBrand: toOptionalString(payment, ['card_brand', 'cardBrand']) || '',
        transactionId,
        paymentAmount: formatMoneyValue(
          pickValue(payment, ['payment_amount', 'paymentAmount']),
          '0.00',
        ),
      };
    })
    .filter((item): item is ERP.ShopeePaymentInfo => Boolean(item));
}

function normalizeInvoiceInfo(record: RawOrderRecord): ERP.InvoiceInfo | undefined {
  const invoice = toRecord(pickValue(record, ['invoice_data', 'invoiceInfo', 'invoice_data_info']));
  const number = toOptionalString(invoice, ['number']);
  if (!number) {
    return undefined;
  }

  return {
    number,
    seriesNumber: toOptionalString(invoice, ['series_number', 'seriesNumber']) || '-',
    accessKey: toOptionalString(invoice, ['access_key', 'accessKey']) || '-',
    issueDate: formatDateTime(pickValue(invoice, ['issue_date', 'issueDate']), '-'),
    totalValue: formatMoneyValue(pickValue(invoice, ['total_value', 'totalValue'])),
    productsTotalValue: formatMoneyValue(
      pickValue(invoice, ['products_total_value', 'productsTotalValue']),
    ),
    taxCode: toOptionalString(invoice, ['tax_code', 'taxCode']) || '-',
  };
}

function normalizeOrderItem(item: unknown): ERP.OrderItemSku | null {
  const record = toRecord(item);
  const skuId =
    toOptionalString(record, ['model_sku', 'skuId', 'item_sku']) ||
    toOptionalString(record, ['item_id', 'itemId']);
  if (!skuId) {
    return null;
  }

  const quantity =
    toOptionalNumber(record, ['model_quantity_purchased', 'quantity', 'modelQuantity']) || 0;

  return {
    skuId,
    skuName:
      toOptionalString(record, ['item_name', 'skuName', 'model_name']) ||
      skuId,
    quantity,
    unitPrice: formatMoneyValue(
      pickValue(record, ['model_discounted_price', 'unitPrice', 'model_original_price']),
    ),
    image:
      toOptionalString(record, ['image', 'image_info.image_url', 'imageInfo.imageUrl']) || '',
    attributes: [
      toOptionalString(record, ['model_name']),
      toOptionalString(record, ['promotion_type']),
    ].filter((item): item is string => Boolean(item)),
  };
}

function normalizeOrderItemList(record: RawOrderRecord) {
  return toArrayValue(record, ['item_list', 'itemList'])
    .map((item) => normalizeOrderItem(item))
    .filter((item): item is ERP.OrderItemSku => Boolean(item));
}

function buildBaseOrder(record: RawOrderRecord) {
  const orderStatus = mapBackendOrderStatus(
    pickValue(record, ['order_status', 'orderStatus', 'platformStatus']),
  );
  const orderSn = toStringValue(record, ['order_sn', 'orderSn', 'orderNo', 'platformOrderNo']);
  const createTime = formatDateTime(
    pickValue(record, ['create_time', 'createTime', 'createdAtRemote', 'orderTime', 'updatedAt']),
    '-',
  );
  const updateTime = formatDateTime(
    pickValue(record, ['update_time', 'updateTime', 'updatedAt', 'createdAtRemote']),
    createTime,
  );
  const shipByDate = formatDateTime(pickValue(record, ['ship_by_date', 'shipByDate']), createTime);
  const payStatus: ERP.PayStatus =
    orderStatus === 'UNPAID'
      ? 'UNPAID'
      : ['IN_CANCEL', 'TO_RETURN'].includes(orderStatus)
        ? 'REFUNDING'
        : orderStatus === 'CANCELLED'
          ? 'REFUNDED'
          : 'PAID';
  const trackingNumber =
    toOptionalString(record, ['tracking_number', 'trackingNo']) ||
    toOptionalString(toRecord(toArrayValue(record, ['package_list', 'packageList'])[0]), [
      'tracking_number',
      'trackingNumber',
    ]);
  const orderLevelShippingCarrier =
    toOptionalString(record, ['shipping_carrier', 'shippingCarrier']) || '-';
  const hasRealPackageList = toArrayValue(record, ['package_list', 'packageList']).length > 0;
  const packageList = normalizePackageList(
    record,
    orderStatus,
    orderSn,
    updateTime,
    shipByDate,
    trackingNumber,
    orderLevelShippingCarrier,
  );
  const shippingCarrier = packageList[0]?.shippingCarrier || orderLevelShippingCarrier;
  const packageNumber =
    toOptionalString(record, ['package_number', 'packageNumber']) ||
    packageList[0]?.packageNumber ||
    '-';
  const buyerCpfId = toOptionalString(record, ['buyer_cpf_id', 'buyerCpfId']);
  const buyerCnpjId = toOptionalString(record, ['buyer_cnpj_id', 'buyerCnpjId', 'tax_id']);
  const deliveryStatus = getDeliveryStatusByOrderStatus(orderStatus);
  const logisticsStatus =
    packageList[0]?.logisticsStatus || getShopeeLogisticsStatusByOrderStatus(orderStatus);
  const packageStatus = packageList[0]?.packageStatus || getPackageStatusByOrderStatus(orderStatus);
  const packageFulfillmentStatus =
    packageList[0]?.packageFulfillmentStatus || getPackageFulfillmentStatusByOrderStatus(orderStatus);
  const afterSaleStatus: ERP.AfterSaleStatus = ['TO_RETURN'].includes(orderStatus)
    ? 'IN_PROGRESS'
    : ['IN_CANCEL', 'CANCELLED'].includes(orderStatus)
      ? 'REFUNDING'
      : 'NONE';
  const syncMeta = normalizeSyncMeta(record, hasRealPackageList, updateTime);
  const explicitAuditStatus = toOptionalString(record, ['audit_status', 'auditStatus']) as
    | ERP.AuditStatus
    | undefined;

  const baseOrder: Omit<ERP.OrderListItem, 'processingProfile'> = {
    id: toStringValue(record, ['id', 'order_sn', 'orderNo']),
    orderNo: toStringValue(record, ['orderNo', 'order_sn', 'orderSn']),
    platformOrderNo: toStringValue(record, ['platformOrderNo', 'order_sn', 'orderSn']),
    orderSn,
    platform: 'Shopee',
    platformChannel: 'SHOPEE',
    platformRegion: toStringValue(record, ['region', 'siteCode', 'platformRegion'], 'BR') as ERP.ShopeeRegionCode,
    platformShopId: toStringValue(record, ['shopId', 'platformShopId']),
    platformStatus: orderStatus,
    fulfillmentStage: getFulfillmentStage(orderStatus),
    fulfillmentStageDescription: getFulfillmentStageDescription(orderStatus),
    nextActionSuggestion: '等待 Shopee / ERP 同步建议',
    branchReason: undefined,
    statusTrail: getStatusTrail(orderStatus),
    shopName: toStringValue(record, ['shopName']),
    buyerName:
      toStringValue(record, ['buyer_username', 'buyerName', 'buyer_name', 'buyerNameMasked'], '-'),
    buyerUserId: toStringValue(record, ['buyer_user_id', 'buyerUserId'], '-'),
    messageToSeller: toStringValue(record, ['message_to_seller', 'messageToSeller'], '-'),
    items:
      normalizeOrderItemList(record)
        .map((item) => item.skuName)
        .slice(0, 2)
        .join(' / ') || 'Shopee 同步订单',
    skuCount:
      toOptionalNumber(record, ['skuCount']) ||
      normalizeOrderItemList(record).reduce((total, item) => total + item.quantity, 0),
    totalAmount: formatMoneyValue(
      pickValue(record, ['total_amount', 'totalAmount', 'paymentInfo.payAmount']),
    ),
    currency: toStringValue(record, ['currency'], 'BRL'),
    createTime,
    updateTime,
    shipByDate,
    daysToShip: toOptionalNumber(record, ['days_to_ship', 'daysToShip']) || 2,
    estimatedShippingFee: formatMoneyValue(
      pickValue(record, ['estimated_shipping_fee', 'estimatedShippingFee']),
    ),
    actualShippingFee: formatMoneyValue(
      pickValue(record, ['actual_shipping_fee', 'actualShippingFee']),
    ),
    paymentMethod: toStringValue(record, ['payment_method', 'paymentMethod'], '-'),
    shippingCarrier,
    checkoutShippingCarrier: toStringValue(
      record,
      ['checkout_shipping_carrier', 'checkoutShippingCarrier'],
      packageList[0]?.logisticsChannelName || shippingCarrier,
    ),
    reverseShippingFee: formatMoneyValue(
      pickValue(record, ['reverse_shipping_fee', 'reverseShippingFee']),
    ),
    orderChargeableWeightGram:
      toOptionalNumber(record, ['order_chargeable_weight_gram', 'orderChargeableWeightGram']) || 0,
    pendingTerms: toStringArray(pickValue(record, ['pending_terms', 'pendingTerms'])),
    fulfillmentFlag: toStringValue(record, ['fulfillment_flag', 'fulfillmentFlag'], 'fulfilled_by_local_seller'),
    buyerCpfId,
    buyerCnpjId,
    cancelBy: toOptionalString(record, ['cancel_by', 'cancelBy']),
    cancelReason: toOptionalString(record, ['cancel_reason', 'cancelReason']),
    buyerCancelReason: toOptionalString(record, ['buyer_cancel_reason', 'buyerCancelReason']),
    packageNumber,
    packageCount: packageList.length,
    packageStatus,
    packageFulfillmentStatus,
    packageList,
    lastSyncTime: syncMeta.lastSyncTime,
    syncMeta,
    infoNeeded: packageList[0]?.infoNeeded || getInfoNeededByOrderStatus(orderStatus),
    pickupDoneTime:
      packageList[0]?.pickupDoneTime ||
      formatOptionalDateTime(pickValue(record, ['pickup_done_time', 'pickupDoneTime'])),
    edtFrom: formatOptionalDateTime(pickValue(record, ['edt_from', 'edtFrom'])),
    edtTo: formatOptionalDateTime(pickValue(record, ['edt_to', 'edtTo', 'edt'])),
    returnRequestDueDate: formatOptionalDateTime(
      pickValue(record, ['return_request_due_date', 'returnRequestDueDate']),
    ),
    orderStatus,
    payStatus,
    auditStatus:
      explicitAuditStatus ||
      (orderStatus === 'READY_TO_SHIP' || orderStatus === 'PENDING_INVOICE'
        ? 'PENDING'
        : orderStatus === 'UNPAID'
          ? 'PENDING'
          : 'APPROVED'),
    deliveryStatus,
    afterSaleStatus,
    warehouseName: toStringValue(record, ['warehouseName'], '-'),
    logisticsCompany:
      packageList[0]?.shippingCarrier ||
      toStringValue(record, ['logisticsCompany', 'shipping_carrier'], shippingCarrier),
    trackingNo: trackingNumber || '-',
    tags: Array.isArray(record.tags) ? (record.tags as ERP.OrderExceptionTag[]) : [],
    exceptionTags: Array.isArray(record.exceptionTags)
      ? (record.exceptionTags as ERP.OrderExceptionTag[])
      : [],
    hitRuleCodes: Array.isArray(record.hitRuleCodes) ? (record.hitRuleCodes as string[]) : [],
    hitRuleNames: Array.isArray(record.hitRuleNames) ? (record.hitRuleNames as string[]) : [],
    exceptionReason: toStringValue(record, ['exceptionReason'], '无异常'),
    riskLevel: (toOptionalString(record, ['riskLevel']) as ERP.RiskLevel) || 'LOW',
    suggestedAction: toStringValue(record, ['suggestedAction'], '正常履约'),
    currentStatus:
      (toOptionalString(record, ['currentStatus']) as ERP.AbnormalCurrentStatus) || 'RESOLVED',
    orderTime: createTime,
    remark: toStringValue(record, ['remark', 'note'], ''),
    locked: Boolean(pickValue(record, ['locked'])),
    logisticsStatus,
    logisticsChannel: toStringValue(
      record,
      [
        'logisticsChannel',
        'checkout_shipping_carrier',
        'checkoutShippingCarrier',
      ],
      packageList[0]?.logisticsChannelName || '-',
    ),
    logisticsAssignedAt: formatOptionalDateTime(pickValue(record, ['logisticsAssignedAt'])),
    dispatchRecommendation: toStringValue(
      record,
      ['dispatchRecommendation'],
      '等待 ERP 准备物流与包裹参数',
    ),
    deliveryAging: toOptionalNumber(record, ['deliveryAging']) || 0,
    freightEstimate: formatMoneyValue(pickValue(record, ['freightEstimate', 'estimated_shipping_fee'])),
    warehouseStatus:
      (toOptionalString(record, ['warehouseStatus']) as ERP.WarehouseStatus) ||
      (['PENDING_INVOICE', 'READY_TO_SHIP', 'PROCESSED', 'RETRY_SHIP'].includes(orderStatus)
        ? 'PENDING'
        : 'ASSIGNED'),
    warehouseAssignedAt: formatOptionalDateTime(pickValue(record, ['warehouseAssignedAt'])),
    allocationStrategy: toStringValue(record, ['allocationStrategy'], '待 ERP 分仓'),
    allocationReason: toStringValue(record, ['allocationReason'], '等待 ERP 仓配分配'),
    stockWarning: toStringValue(record, ['stockWarning'], '-'),
    stockSufficient: pickValue(record, ['stockSufficient']) !== false,
    recommendedWarehouse: toStringValue(record, ['recommendedWarehouse'], '-'),
  };

  const nextActionSuggestion = getNextActionSuggestion(baseOrder);
  const branchReason = getBranchReason(baseOrder);

  return {
    ...baseOrder,
    nextActionSuggestion,
    branchReason,
  };
}

export function normalizeBackendOrder(record: RawOrderRecord): ERP.OrderListItem {
  return ensureOrderPlatformProfile(buildBaseOrder(record));
}

export function normalizeBackendOrderDetail(record: RawOrderRecord): ERP.OrderDetail {
  const baseOrder = normalizeBackendOrder(record);
  const buyerDocument = baseOrder.buyerCnpjId || baseOrder.buyerCpfId;
  const paymentInfoList = normalizePaymentInfoList(record);
  const paymentMethod =
    paymentInfoList[0]?.paymentMethod || toStringValue(record, ['payment_method', 'paymentMethod'], '-');
  const payAmount =
    paymentInfoList.reduce((sum, item) => sum + Number(item.paymentAmount || 0), 0) || Number(baseOrder.totalAmount);

  return {
    ...baseOrder,
    shopId: toStringValue(record, ['shopId', 'platformShopId']),
    buyerEmail: toStringValue(record, ['buyerEmail', 'buyer_email'], '-'),
    buyerNote: toStringValue(record, ['buyerNote'], '-'),
    sellerNote: toStringValue(record, ['note', 'sellerNote'], '-'),
    paymentInfo: {
      method: paymentMethod,
      transactionNo: paymentInfoList[0]?.transactionId || toStringValue(record, ['transactionNo'], '-'),
      paidAt: formatDateTime(pickValue(record, ['pay_time', 'payTime']), '-'),
      payAmount: formatMoneyValue(payAmount, baseOrder.totalAmount),
      currency: baseOrder.currency || 'BRL',
    },
    paymentInfoList,
    invoiceInfo: normalizeInvoiceInfo(record),
    addressInfo: normalizeAddressInfo(record, buyerDocument),
    logisticsInfo: {
      logisticsCompany: baseOrder.shippingCarrier || baseOrder.logisticsCompany,
      logisticsService: baseOrder.checkoutShippingCarrier || baseOrder.logisticsChannel,
      logisticsChannel: baseOrder.logisticsChannel,
      logisticsChannelId: baseOrder.packageList[0]?.logisticsChannelId,
      serviceCode: baseOrder.packageList[0]?.serviceCode,
      shippingDocumentStatus: baseOrder.packageList[0]?.shippingDocumentStatus,
      shippingDocumentType: baseOrder.packageList[0]?.shippingDocumentType,
      lastDocumentSyncTime: baseOrder.packageList[0]?.lastDocumentSyncTime,
      logisticsProfile: baseOrder.packageList[0]?.logisticsProfile,
      trackingNo: baseOrder.trackingNo,
      packageNumber: baseOrder.packageNumber,
      packageStatus: baseOrder.packageStatus,
      fulfillmentStatus: baseOrder.packageFulfillmentStatus,
      warehouseName: baseOrder.warehouseName,
      shippedAt: baseOrder.pickupDoneTime,
      deliveryStatus: baseOrder.deliveryStatus,
      logisticsStatus: baseOrder.logisticsStatus,
      dispatchRecommendation: baseOrder.dispatchRecommendation,
      freightEstimate: baseOrder.freightEstimate,
      infoNeeded: baseOrder.infoNeeded,
    },
    itemList: normalizeOrderItemList(record),
    operationLogs: Array.isArray(record.operationLogs) ? (record.operationLogs as ERP.OrderLogItem[]) : [],
  };
}

export function isNormalizedOrderDetail(value: unknown): value is ERP.OrderDetail {
  return isRecord(value) && 'processingProfile' in value && 'addressInfo' in value;
}

export default {
  normalizeBackendOrder,
  normalizeBackendOrderDetail,
  isNormalizedOrderDetail,
};
