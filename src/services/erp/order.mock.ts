import dayjs from 'dayjs';
import {
  ABNORMAL_BRANCH_STATUSES,
  CANCEL_REFUND_STATUSES,
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
  LOGISTICS_MANAGEABLE_STATUSES,
  SHIPPED_VIEW_STATUSES,
} from './orderFlow';
import { buildShopeeProcessingProfile, getShopeePlatformStatus } from './orderPlatform';

const shops = ['Shopee 巴西旗舰店', 'Shopee 圣保罗仓店', 'Shopee Rio 分销店'];
const buyers = ['Lucas Silva', 'Maria Costa', 'Pedro Santos', 'Ana Oliveira'];
const warehouses = ['圣保罗一仓', '里约中转仓', '库里蒂巴备货仓'];
const logisticsCompanies = ['Shopee Xpress', 'Correios', 'Jadlog', 'Loggi', 'Total Express'];
const logisticsChannels = ['标准快递', '经济快递', '当日优先', '敏感货专线'];
type MockOrderBase = Omit<ERP.OrderDetail, 'processingProfile'>;

function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}

function formatAmount(value: number) {
  return value.toFixed(2);
}

function pick<T>(array: T[], index: number) {
  return array[index % array.length];
}

function includesText(value: string, keyword?: string) {
  if (!keyword) {
    return true;
  }
  return value.toLowerCase().includes(keyword.toLowerCase());
}

const baseRules: Omit<ERP.RuleConfigItem, 'hitOrderCount'>[] = [
  {
    id: 'RULE-ADDRESS',
    ruleCode: 'ADDR-001',
    ruleName: '地址异常自动拦截',
    ruleType: 'ADDRESS_VALIDATION',
    enabled: true,
    priority: 100,
    hitTag: 'ADDRESS_EXCEPTION',
    hitReason: '地址解析失败或缺少关键字段',
    hitScope: '全部订单',
    actionType: '拦截发货',
    riskLevel: 'HIGH',
    suggestedAction: '修正地址后重试',
    remark: '收货地址校验失败时立即拦截到异常池。',
    createdAt: dayjs().subtract(20, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    id: 'RULE-RISK',
    ruleCode: 'RISK-001',
    ruleName: '高风险订单二次审核',
    ruleType: 'RISK_CONTROL',
    enabled: true,
    priority: 95,
    hitTag: 'HIGH_RISK',
    hitReason: '风控评分过高，需人工复核',
    hitScope: '高客单价订单',
    actionType: '转人工审核',
    riskLevel: 'CRITICAL',
    suggestedAction: '转人工审核',
    remark: '高风险订单禁止直接履约。',
    createdAt: dayjs().subtract(16, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    id: 'RULE-STOCK',
    ruleCode: 'STOCK-001',
    ruleName: '缺货自动切仓',
    ruleType: 'STOCK_ALLOCATION',
    enabled: true,
    priority: 88,
    hitTag: 'OUT_OF_STOCK',
    hitReason: '主仓库存不足，需切换推荐仓',
    hitScope: '待出货订单',
    actionType: '重分仓',
    riskLevel: 'HIGH',
    suggestedAction: '切换推荐仓库',
    remark: '若主仓库存不足，优先尝试备货仓。',
    createdAt: dayjs().subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(10, 'hour').format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    id: 'RULE-SYNC',
    ruleCode: 'SYNC-001',
    ruleName: '平台同步失败补偿',
    ruleType: 'PLATFORM_SYNC',
    enabled: true,
    priority: 82,
    hitTag: 'SYNC_FAILED',
    hitReason: '平台状态回传失败，需要重试同步',
    hitScope: '平台同步链路',
    actionType: '补偿同步',
    riskLevel: 'MEDIUM',
    suggestedAction: '重试平台同步',
    remark: '同步失败时自动转入异常池等待补偿。',
    createdAt: dayjs().subtract(12, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(8, 'hour').format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    id: 'RULE-BUYER',
    ruleCode: 'BUYER-001',
    ruleName: '黑名单买家拦截',
    ruleType: 'BUYER_CONTROL',
    enabled: true,
    priority: 98,
    hitTag: 'BLACKLIST_BUYER',
    hitReason: '买家命中黑名单或历史纠纷过多',
    hitScope: '风险买家',
    actionType: '冻结订单',
    riskLevel: 'CRITICAL',
    suggestedAction: '联系买家确认',
    remark: '黑名单买家需客服复核后再决定是否履约。',
    createdAt: dayjs().subtract(11, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(6, 'hour').format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    id: 'RULE-TIMEOUT',
    ruleCode: 'TIME-001',
    ruleName: '超时未处理升级',
    ruleType: 'TIMEOUT_ESCALATION',
    enabled: true,
    priority: 76,
    hitTag: 'TIMEOUT',
    hitReason: '订单超时未处理，需要升级转人工',
    hitScope: '待处理订单',
    actionType: '升级处理',
    riskLevel: 'MEDIUM',
    suggestedAction: '转人工审核',
    remark: '处理超时自动提醒运营人工介入。',
    createdAt: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(4, 'hour').format('YYYY-MM-DD HH:mm:ss'),
  },
];

const ruleTagMap = new Map(baseRules.map((rule) => [rule.hitTag, rule]));

function buildItemList(index: number): ERP.OrderItemSku[] {
  return [
    {
      skuId: `SKU-${1000 + index}-1`,
      skuName: `便携收纳盒 ${index % 5}`,
      quantity: (index % 3) + 1,
      unitPrice: formatAmount(39.9 + index),
      image: 'https://gw.alipayobjects.com/zos/rmsportal/eeHMaZBwmTvLdIwMfBpg.png',
      attributes: ['颜色: 黑色', '规格: 标准'],
    },
    {
      skuId: `SKU-${1000 + index}-2`,
      skuName: `桌面支架 ${index % 4}`,
      quantity: 1,
      unitPrice: formatAmount(19.9 + index / 2),
      image: 'https://gw.alipayobjects.com/zos/rmsportal/eeHMaZBwmTvLdIwMfBpg.png',
      attributes: ['颜色: 白色', '规格: 升级'],
    },
  ];
}

function buildExceptionTags(index: number, status: ERP.OrderStatus): ERP.OrderExceptionTag[] {
  const tags: ERP.OrderExceptionTag[] = [];
  if (status === 'IN_CANCEL' || index % 6 === 0) {
    tags.push('ADDRESS_EXCEPTION');
  }
  if (index % 8 === 0) {
    tags.push('OUT_OF_STOCK');
  }
  if (status === 'RETRY_SHIP' || index % 9 === 0) {
    tags.push('HIGH_RISK');
  }
  if (index % 10 === 0) {
    tags.push('SYNC_FAILED');
  }
  if (index % 11 === 0) {
    tags.push('BLACKLIST_BUYER');
  }
  if (index % 5 === 0) {
    tags.push('TIMEOUT');
  }
  return Array.from(new Set(tags));
}

function buildPackageList(
  index: number,
  status: ERP.OrderStatus,
  orderSn: string,
  shipByDate: string,
  updateTime: string,
  itemList: ERP.OrderItemSku[],
): ERP.ShopeePackageInfo[] {
  const packageCount = index % 6 === 0 ? 2 : 1;

  return Array.from({ length: packageCount }).map((_, packageIndex) => {
    const packageNumber = `PKG${202604230000 + index}${packageIndex + 1}`;
    const shippingCarrier =
      status === 'UNPAID' ? '-' : pick(logisticsCompanies, index + packageIndex);
    const logisticsStatus = getShopeeLogisticsStatusByOrderStatus(status);
    const infoNeeded = getInfoNeededByOrderStatus(status);
    const packageItems = itemList
      .filter((_, itemIndex) => itemIndex % packageCount === packageIndex)
      .map<ERP.ShopeePackageItem>((item, itemIndex) => ({
        itemId: item.skuId,
        modelId: `${item.skuId}-MODEL`,
        modelQuantity: item.quantity,
        orderItemId: `${index}-${itemIndex + 1}`,
        productLocationId: `BR-WH-${(index + packageIndex) % 3}`,
      }));

    return {
      orderSn,
      packageNumber,
      packageStatus: getPackageStatusByOrderStatus(status),
      packageFulfillmentStatus: getPackageFulfillmentStatusByOrderStatus(status),
      fulfillmentStatus: getPackageFulfillmentStatusByOrderStatus(status),
      logisticsStatus,
      shippingCarrier,
      logisticsChannelId: 80000 + ((index + packageIndex) % 5),
      trackingNumber:
        ['PROCESSED', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED', 'RETRY_SHIP'].includes(status)
          ? `TRK${660000 + index + packageIndex}`
          : undefined,
      allowSelfDesignAwb: status !== 'UNPAID',
      infoNeeded,
      parcelItemCount: packageItems.reduce((sum, item) => sum + item.modelQuantity, 0),
      itemCount: packageItems.reduce((sum, item) => sum + item.modelQuantity, 0),
      latestPackageUpdateTime: updateTime,
      dataSource: 'REALTIME_SYNCED',
      realFieldList: [
        'package_number',
        'tracking_number',
        'fulfillment_status',
        'logistics_status',
        'shipping_carrier',
        'item_list',
        'update_time',
      ],
      shipByDate,
      updateTime,
      pickupDoneTime:
        ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'].includes(status)
          ? dayjs(updateTime).subtract(12, 'hour').format('YYYY-MM-DD HH:mm:ss')
          : undefined,
      itemList: packageItems,
    };
  });
}

function getRiskScore(tags: ERP.OrderExceptionTag[]): ERP.RiskLevel {
  if (tags.includes('HIGH_RISK') || tags.includes('BLACKLIST_BUYER')) {
    return 'CRITICAL';
  }
  if (tags.includes('ADDRESS_EXCEPTION') || tags.includes('OUT_OF_STOCK')) {
    return 'HIGH';
  }
  if (tags.includes('SYNC_FAILED') || tags.includes('TIMEOUT')) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function buildOrder(index: number): ERP.OrderDetail {
  const itemList = buildItemList(index);
  const orderNo = `SO${202604230000 + index}`;
  const platformOrderNo = `PF${90890000 + index}`;
  const orderTime = dayjs().subtract(index * 2, 'hour').format('YYYY-MM-DD HH:mm:ss');
  const createTime = orderTime;
  const updateTime = dayjs(orderTime).add(35, 'minute').format('YYYY-MM-DD HH:mm:ss');
  const shipByDate = dayjs(orderTime).add(2 + (index % 4), 'day').format('YYYY-MM-DD HH:mm:ss');
  const orderStatuses: ERP.OrderStatus[] = [
    'UNPAID',
    'PENDING_INVOICE',
    'READY_TO_SHIP',
    'PROCESSED',
    'SHIPPED',
    'TO_CONFIRM_RECEIVE',
    'COMPLETED',
    'IN_CANCEL',
    'CANCELLED',
    'RETRY_SHIP',
    'TO_RETURN',
  ];
  const status = pick(orderStatuses, index);
  const payStatus: ERP.PayStatus =
    status === 'UNPAID'
      ? 'UNPAID'
      : status === 'IN_CANCEL' || status === 'TO_RETURN'
        ? 'REFUNDING'
        : status === 'CANCELLED'
          ? 'REFUNDED'
          : 'PAID';
  const auditStatus: ERP.AuditStatus =
    status === 'READY_TO_SHIP' || status === 'PENDING_INVOICE'
      ? 'PENDING'
      : status === 'IN_CANCEL'
        ? 'REJECTED'
        : index % 13 === 0
          ? 'LOCKED'
          : 'APPROVED';
  const deliveryStatus = getDeliveryStatusByOrderStatus(status);
  const logisticsStatus = getShopeeLogisticsStatusByOrderStatus(status);
  const packageStatus = getPackageStatusByOrderStatus(status);
  const packageFulfillmentStatus = getPackageFulfillmentStatusByOrderStatus(status);
  const infoNeeded = getInfoNeededByOrderStatus(status);
  const afterSaleStatus: ERP.AfterSaleStatus =
    status === 'TO_RETURN'
      ? 'IN_PROGRESS'
      : status === 'IN_CANCEL'
        ? 'REFUNDING'
        : status === 'CANCELLED'
          ? 'REFUNDED'
          : 'NONE';
  const exceptionTags = buildExceptionTags(index, status);
  const hitRules = exceptionTags
    .map((tag) => ruleTagMap.get(tag))
    .filter((item): item is Omit<ERP.RuleConfigItem, 'hitOrderCount'> => Boolean(item));
  const riskLevel = hitRules.length
    ? hitRules
        .map((rule) => rule.riskLevel)
        .sort((left, right) => ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].indexOf(right) - ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].indexOf(left))[0]
    : getRiskScore(exceptionTags);
  const currentStatus: ERP.AbnormalCurrentStatus =
    exceptionTags.length === 0
      ? 'RESOLVED'
      : index % 4 === 0
        ? 'MANUAL_REVIEW'
        : index % 3 === 0
          ? 'RECHECKING'
          : 'PENDING_REVIEW';
  const warehouseStatus: ERP.WarehouseStatus =
    auditStatus === 'LOCKED'
      ? 'LOCKED'
      : exceptionTags.includes('OUT_OF_STOCK')
        ? 'OUT_OF_STOCK'
        : ['PROCESSED', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED', 'TO_RETURN'].includes(status)
          ? 'ASSIGNED'
          : ['READY_TO_SHIP', 'RETRY_SHIP', 'UNPAID'].includes(status)
            ? 'PENDING'
            : index % 7 === 0
              ? 'FAILED'
              : 'ASSIGNED';
  const warehouseName = pick(warehouses, index);
  const recommendedWarehouse = exceptionTags.includes('OUT_OF_STOCK')
    ? pick(warehouses, index + 1)
    : warehouseName;
  const logisticsCompany =
    ['UNPAID', 'IN_CANCEL', 'CANCELLED'].includes(status) ? '-' : pick(logisticsCompanies, index);
  const logisticsChannel =
    ['UNPAID', 'IN_CANCEL', 'CANCELLED'].includes(status) ? '-' : pick(logisticsChannels, index);
  const trackingNo =
    ['PROCESSED', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED', 'RETRY_SHIP'].includes(status)
      ? `TRK${650000 + index}`
      : '-';
  const dispatchRecommendation =
    status === 'RETRY_SHIP'
      ? '建议重新获取 shipping parameter，并切换为更稳妥的取件方式。'
      : `优先通过 ${pick(logisticsCompanies, index)} ${pick(logisticsChannels, index)} 处理包裹。`;
  const suggestedAction = hitRules[0]?.suggestedAction || '正常履约';
  const exceptionReason = hitRules.length
    ? hitRules.map((item) => item.hitReason).join('；')
    : '无异常';
  const locked = auditStatus === 'LOCKED';
  const warehouseAssignedAt =
    warehouseStatus === 'ASSIGNED'
      ? dayjs(orderTime).add(40, 'minute').format('YYYY-MM-DD HH:mm:ss')
      : undefined;
  const logisticsAssignedAt =
    LOGISTICS_MANAGEABLE_STATUSES.includes(status)
      ? dayjs(orderTime).add(2, 'hour').format('YYYY-MM-DD HH:mm:ss')
      : undefined;
  const packageList = buildPackageList(index, status, orderNo, shipByDate, updateTime, itemList);
  const packageNumber = packageList[0]?.packageNumber || '-';
  const operationLogs: ERP.OrderLogItem[] = [
    {
      id: `LOG-${index}-1`,
      orderNo,
      operator: 'system',
      action: '订单同步',
      detail: '平台订单同步进入订单中心',
      createdAt: dayjs(orderTime).subtract(20, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      module: 'ORDER_SYNC',
    },
    {
      id: `LOG-${index}-2`,
      orderNo,
      operator: index % 3 === 0 ? 'risk.bot' : 'erp.operator',
      action: exceptionTags.length ? '异常命中' : '审核通过',
      detail: exceptionTags.length
        ? `命中规则 ${hitRules.map((item) => item.ruleCode).join(', ')}`
        : '订单进入 Shopee 状态流转处理',
      createdAt: dayjs(orderTime).add(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      module: 'ORDER_AUDIT',
    },
  ];

  const baseOrder: MockOrderBase = {
    id: `ORDER-${index}`,
    orderNo,
    platformOrderNo,
    orderSn: orderNo,
    shopId: `SHOP-${index % 3}`,
    shopName: pick(shops, index),
    platform: 'Shopee',
    platformChannel: 'SHOPEE',
    platformRegion: 'BR',
    platformShopId: `SHOP-${index % 3}`,
    platformStatus: getShopeePlatformStatus({ orderStatus: status }),
    fulfillmentStage: getFulfillmentStage(status),
    fulfillmentStageDescription: getFulfillmentStageDescription(status),
    nextActionSuggestion: '',
    branchReason: undefined,
    statusTrail: getStatusTrail(status),
    buyerName: pick(buyers, index),
    buyerUserId: `BR-BUYER-${1000 + index}`,
    buyerEmail: `buyer${index}@example.com`,
    buyerNote: index % 2 === 0 ? '请确认包装完整' : '',
    sellerNote: index % 5 === 0 ? '买家要求周末送达' : '',
    messageToSeller: index % 2 === 0 ? '请尽快出货' : '包装请完整',
    items: itemList.map((item) => item.skuName).join(' / '),
    skuCount: itemList.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: formatAmount(89 + index * 3.6),
    currency: 'BRL',
    createTime,
    updateTime,
    shipByDate,
    daysToShip: 2 + (index % 4),
    estimatedShippingFee: formatAmount(8 + index * 0.8),
    actualShippingFee: ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'].includes(status)
      ? formatAmount(9 + index * 0.65)
      : '0.00',
    paymentMethod: index % 3 === 0 ? 'Pix' : 'Credit Card',
    shippingCarrier: logisticsCompany,
    checkoutShippingCarrier: logisticsChannel,
    reverseShippingFee: status === 'TO_RETURN' ? formatAmount(5 + index * 0.3) : '0.00',
    orderChargeableWeightGram: 850 + index * 12,
    pendingTerms: status === 'UNPAID' ? ['SYSTEM_PENDING'] : [],
    fulfillmentFlag: 'fulfilled_by_local_seller',
    buyerCpfId: `529.982.247-${String(index % 90).padStart(2, '0')}`,
    buyerCnpjId: index % 6 === 0 ? `12.345.678/0001-${String(10 + (index % 89)).padStart(2, '0')}` : undefined,
    cancelBy:
      status === 'IN_CANCEL' || status === 'CANCELLED' ? (index % 2 === 0 ? 'buyer' : 'seller') : undefined,
    cancelReason:
      status === 'IN_CANCEL' || status === 'CANCELLED'
        ? (index % 2 === 0 ? 'Cliente solicitou cancelamento antes da coleta' : 'Sem estoque para emissao fiscal')
        : undefined,
    buyerCancelReason: status === 'IN_CANCEL' ? '买家申请取消订单' : undefined,
    packageNumber,
    packageCount: packageList.length,
    packageStatus,
    packageFulfillmentStatus,
    packageList,
    lastSyncTime: updateTime,
    syncMeta: {
      lastSyncTime: updateTime,
      detailSource: 'REALTIME_SYNCED',
      packageSource: 'REALTIME_SYNCED',
      paymentSource: 'REALTIME_SYNCED',
      invoiceSource: status === 'UNPAID' ? 'FALLBACK' : 'REALTIME_SYNCED',
      addressSource: 'REALTIME_SYNCED',
      statusSource: 'REALTIME_SYNCED',
      fallbackFields: status === 'UNPAID' ? ['invoice_data'] : [],
    },
    infoNeeded,
    pickupDoneTime: packageList[0]?.pickupDoneTime,
    edtFrom:
      ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'].includes(status)
        ? dayjs(shipByDate).add(2, 'day').format('YYYY-MM-DD HH:mm:ss')
        : undefined,
    edtTo:
      ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'].includes(status)
        ? dayjs(shipByDate).add(4, 'day').format('YYYY-MM-DD HH:mm:ss')
        : undefined,
    returnRequestDueDate:
      ['COMPLETED', 'TO_RETURN'].includes(status)
        ? dayjs(orderTime).add(15, 'day').format('YYYY-MM-DD HH:mm:ss')
        : undefined,
    orderStatus: status,
    payStatus,
    auditStatus,
    deliveryStatus,
    afterSaleStatus,
    warehouseName,
    logisticsCompany,
    trackingNo,
    tags: exceptionTags,
    exceptionTags,
    hitRuleCodes: hitRules.map((item) => item.ruleCode),
    hitRuleNames: hitRules.map((item) => item.ruleName),
    exceptionReason,
    riskLevel,
    suggestedAction,
    currentStatus,
    orderTime,
    remark: index % 4 === 0 ? '需优先处理' : '',
    locked,
    logisticsStatus,
    logisticsChannel,
    logisticsAssignedAt,
    dispatchRecommendation,
    deliveryAging: index % 7 === 0 ? 48 : 12 + (index % 24),
    freightEstimate: formatAmount(8 + index * 0.8),
    warehouseStatus,
    warehouseAssignedAt,
    allocationStrategy: warehouseStatus === 'OUT_OF_STOCK' ? '按库存兜底' : '就近履约',
    allocationReason:
      warehouseStatus === 'OUT_OF_STOCK'
        ? '主仓库存不足，建议切换备货仓'
        : '距离买家地址最近且库存充足',
    stockWarning: warehouseStatus === 'OUT_OF_STOCK' ? '主仓库存不足' : '库存正常',
    stockSufficient: warehouseStatus !== 'OUT_OF_STOCK',
    recommendedWarehouse,
    paymentInfo: {
      method: index % 3 === 0 ? 'Pix' : 'Credit Card',
      transactionNo: `TXN${980000 + index}`,
      paidAt: dayjs(orderTime).add(5, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      payAmount: formatAmount(89 + index * 3.6),
      currency: 'BRL',
    },
    paymentInfoList: [
      {
        paymentMethod: index % 3 === 0 ? 'Pix' : 'Credit Card',
        paymentProcessorRegister: '12.345.678/0001-90',
        cardBrand: index % 3 === 0 ? '' : 'VISA',
        transactionId: `AUTH${780000 + index}`,
        paymentAmount: formatAmount(89 + index * 3.6),
      },
    ],
    invoiceInfo:
      status === 'UNPAID'
        ? undefined
        : {
            number: `NF${770000 + index}`,
            seriesNumber: `S-${(index % 10) + 1}`,
            accessKey: `KEY${8800000000 + index}`,
            issueDate: updateTime,
            totalValue: formatAmount(89 + index * 3.6),
            productsTotalValue: formatAmount(80 + index * 3.1),
            taxCode: '5102',
          },
    addressInfo: {
      receiverName: pick(buyers, index),
      receiverPhone: `+55 11 9${String(10000000 + index).slice(-8)}`,
      country: 'Brazil',
      countryCode: 'BR',
      state: 'Sao Paulo',
      city: 'Sao Paulo',
      district: `District ${index % 6}`,
      addressLine1: `Rua ${120 + index}, Centro`,
      addressLine2: `Apt ${index % 20}`,
      zipCode: `0100${index % 10}-000`,
      fullAddress: `Rua ${120 + index}, Centro, Apt ${index % 20}, District ${index % 6}, Sao Paulo - SP`,
      recipientTaxId:
        index % 6 === 0
          ? `12.345.678/0001-${String(10 + (index % 89)).padStart(2, '0')}`
          : `529.982.247-${String(index % 90).padStart(2, '0')}`,
      recipientTaxIdType: index % 6 === 0 ? 'CNPJ' : 'CPF',
    },
    logisticsInfo: {
      logisticsCompany,
      logisticsService: logisticsChannel,
      logisticsChannel,
      trackingNo,
      packageNumber,
      packageStatus,
      fulfillmentStatus: packageFulfillmentStatus,
      warehouseName,
      shippedAt:
        ['SHIPPED', 'TO_CONFIRM_RECEIVE'].includes(deliveryStatus)
          ? dayjs(orderTime).add(1, 'day').format('YYYY-MM-DD HH:mm:ss')
          : undefined,
      deliveryStatus,
      logisticsStatus,
      dispatchRecommendation,
      freightEstimate: formatAmount(8 + index * 0.8),
      infoNeeded,
    },
    itemList,
    operationLogs,
  };

  baseOrder.branchReason = getBranchReason(baseOrder);
  baseOrder.nextActionSuggestion = getNextActionSuggestion(baseOrder);

  return {
    ...baseOrder,
    processingProfile: buildShopeeProcessingProfile(baseOrder),
  };
}

export const mockOrders: ERP.OrderDetail[] = Array.from({ length: 48 }).map((_, index) =>
  buildOrder(index + 1),
);

function buildRulesFrom(source: Array<Omit<ERP.RuleConfigItem, 'hitOrderCount'> | ERP.RuleConfigItem>) {
  return source.map((rule) => ({
    ...rule,
    hitOrderCount: mockOrders.filter((order) =>
      order.hitRuleCodes.includes(rule.ruleCode),
    ).length,
  }));
}

export let mockRules: ERP.RuleConfigItem[] = buildRulesFrom(baseRules);

function paginate<T>(data: T[], current = 1, pageSize = 10): API.ListResponse<T> {
  const safeCurrent = Number(current) || 1;
  const safePageSize = Number(pageSize) || 10;
  const start = (safeCurrent - 1) * safePageSize;

  return {
    data: data.slice(start, start + safePageSize),
    total: data.length,
    success: true,
    current: safeCurrent,
    pageSize: safePageSize,
  };
}

function sortOrders(data: ERP.OrderDetail[], sorter?: ERP.OrderQueryParams['sorter']) {
  if (!sorter) {
    return data;
  }
  const [field, order] = Object.entries(sorter).find(([, value]) => Boolean(value)) || [];
  if (!field || !order) {
    return data;
  }

  return [...data].sort((prev, next) => {
    const left = String((prev as Record<string, unknown>)[field] ?? '');
    const right = String((next as Record<string, unknown>)[field] ?? '');
    return order === 'ascend'
      ? left.localeCompare(right, 'zh-CN')
      : right.localeCompare(left, 'zh-CN');
  });
}

export function filterOrders(params: ERP.OrderQueryParams = {}) {
  const filtered = mockOrders.filter((order) => {
    if (!includesText(order.orderNo, params.orderNo)) return false;
    if (!includesText(order.platformOrderNo, params.platformOrderNo)) return false;
    if (!includesText(order.shopName, params.shopName)) return false;
    if (!includesText(order.buyerName, params.buyerName)) return false;
    if (params.sku && !order.items.toLowerCase().includes(params.sku.toLowerCase())) return false;
    if (params.orderStatus && order.orderStatus !== params.orderStatus) return false;
    if (params.platformStatus && order.platformStatus !== params.platformStatus) return false;
    if (params.payStatus && order.payStatus !== params.payStatus) return false;
    if (params.warehouseName && order.warehouseName !== params.warehouseName) return false;
    if (params.logisticsCompany && order.logisticsCompany !== params.logisticsCompany) return false;
    if (params.logisticsStatus && order.logisticsStatus !== params.logisticsStatus) return false;
    if (params.warehouseStatus && order.warehouseStatus !== params.warehouseStatus) return false;
    if (params.packageStatus && order.packageStatus !== params.packageStatus) return false;
    if (
      params.packageFulfillmentStatus &&
      order.packageFulfillmentStatus !== params.packageFulfillmentStatus
    ) {
      return false;
    }
    if (params.fulfillmentFlag && order.fulfillmentFlag !== params.fulfillmentFlag) return false;
    if (params.cancelBy && order.cancelBy !== params.cancelBy) return false;
    if (params.logisticsChannel && !includesText(order.logisticsChannel, params.logisticsChannel)) {
      return false;
    }
    if (params.exceptionTag && !order.exceptionTags.includes(params.exceptionTag)) return false;
    if (params.hitRuleCode && !order.hitRuleCodes.includes(params.hitRuleCode)) return false;
    if (params.exceptionReason && !includesText(order.exceptionReason, params.exceptionReason)) return false;
    if (params.riskLevel && order.riskLevel !== params.riskLevel) return false;
    if (params.suggestedAction && !includesText(order.suggestedAction, params.suggestedAction)) return false;
    if (params.currentStatus && order.currentStatus !== params.currentStatus) return false;
    if (params.currentTab === 'pending') {
      if (
        ![
          'UNPAID',
          'PENDING_INVOICE',
          'READY_TO_SHIP',
          'PROCESSED',
          'RETRY_SHIP',
          'IN_CANCEL',
          'TO_RETURN',
        ].includes(order.orderStatus)
      ) {
        return false;
      }
    }
    if (params.currentTab === 'pendingAudit' && order.orderStatus !== 'READY_TO_SHIP') return false;
    if (
      params.currentTab === 'pendingShipment' &&
      !LOGISTICS_MANAGEABLE_STATUSES.includes(order.orderStatus)
    ) {
      return false;
    }
    if (params.currentTab === 'shipped' && !SHIPPED_VIEW_STATUSES.includes(order.orderStatus)) {
      return false;
    }
    if (params.currentTab === 'cancelRefund' && !CANCEL_REFUND_STATUSES.includes(order.orderStatus)) {
      return false;
    }
    if (
      params.currentTab === 'abnormal' &&
      !order.exceptionTags.length &&
      !ABNORMAL_BRANCH_STATUSES.includes(order.orderStatus)
    ) {
      return false;
    }
    if (
      params.currentTab === 'afterSale' &&
      order.afterSaleStatus === 'NONE' &&
      order.orderStatus !== 'TO_RETURN'
    ) {
      return false;
    }
    if (params.startTime && dayjs(order.orderTime).isBefore(dayjs(params.startTime))) return false;
    if (params.endTime && dayjs(order.orderTime).isAfter(dayjs(params.endTime))) return false;
    return true;
  });

  return sortOrders(filtered, params.sorter);
}

export function mockQueryOrders(params: ERP.OrderQueryParams = {}) {
  return paginate(filterOrders(params), params.current, params.pageSize);
}

export function mockQueryLogisticsOrders(params: ERP.OrderQueryParams = {}) {
  return paginate(filterOrders(params), params.current, params.pageSize);
}

export function mockQueryWarehouseOrders(params: ERP.OrderQueryParams = {}) {
  return paginate(filterOrders(params), params.current, params.pageSize);
}

export function mockGetOrderDetail(id: string) {
  return mockOrders.find((item) => item.id === id || item.orderNo === id) || mockOrders[0];
}

export function mockQueryAbnormalOrders(params: ERP.OrderQueryParams = {}) {
  return paginate(
    filterOrders({ ...params, currentTab: 'abnormal' }),
    params.current,
    params.pageSize,
  );
}

export function mockQueryAfterSales(params: ERP.OrderQueryParams = {}) {
  const rows = filterOrders({ ...params, currentTab: 'afterSale' }).map<ERP.AfterSaleItem>(
    (order, index) => ({
      id: `AFTER-${index + 1}`,
      sourceOrderId: order.id,
      orderNo: order.orderNo,
      afterSaleNo: `AS${2026042300 + index}`,
      platform: order.platform,
      platformChannel: order.platformChannel,
      platformRegion: order.platformRegion,
      platformStatus: order.platformStatus,
      buyerName: order.buyerName,
      shopName: order.shopName,
      type: index % 2 === 0 ? '退款' : '退货退款',
      reason: order.exceptionReason !== '无异常' ? order.exceptionReason : '买家申请退款',
      status: order.afterSaleStatus === 'NONE' ? 'IN_PROGRESS' : order.afterSaleStatus,
      amount: order.totalAmount,
      createdAt: order.orderTime,
      updatedAt: dayjs(order.orderTime).add(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      processingProfile: order.processingProfile,
    }),
  );

  return paginate(rows, params.current, params.pageSize);
}

export function mockQueryLogs(params: ERP.OrderLogQueryParams = {}) {
  const rows = mockOrders
    .flatMap((item) => item.operationLogs)
    .filter((log) => {
      if (params.orderNo && !includesText(log.orderNo, params.orderNo)) return false;
      if (params.operator && !includesText(log.operator, params.operator)) return false;
      if (params.module && log.module !== params.module) return false;
      return true;
    });

  return paginate(rows, params.current, params.pageSize);
}

export function mockQueryRules(params: ERP.RuleQueryParams = {}) {
  const rows = buildRulesFrom(mockRules).filter((rule) => {
    if (params.ruleName && !includesText(rule.ruleName, params.ruleName)) return false;
    if (params.ruleCode && !includesText(rule.ruleCode, params.ruleCode)) return false;
    if (params.ruleType && rule.ruleType !== params.ruleType) return false;
    if (params.hitTag && rule.hitTag !== params.hitTag) return false;
    if (params.riskLevel && rule.riskLevel !== params.riskLevel) return false;
    if (typeof params.enabled === 'boolean' && rule.enabled !== params.enabled) return false;
    return true;
  });

  return paginate(rows, params.current, params.pageSize);
}

export function mockGetRuleDetail(id: string) {
  const rules = buildRulesFrom(mockRules);
  return rules.find((item) => item.id === id || item.ruleCode === id) || rules[0];
}

function refreshRuleHitCount() {
  mockRules = buildRulesFrom(mockRules);
}

function appendLog(order: ERP.OrderDetail, action: string, detail: string) {
  order.operationLogs.unshift({
    id: `LOG-${Date.now()}-${order.id}`,
    orderNo: order.orderNo,
    operator: 'erp.operator',
    action,
    detail,
    createdAt: now(),
    module: 'ORDER_CENTER',
  });
}

function refreshPlatformProfile(order: ERP.OrderDetail) {
  order.platformStatus = getShopeePlatformStatus({ orderStatus: order.orderStatus });
  order.fulfillmentStage = getFulfillmentStage(order.orderStatus);
  order.fulfillmentStageDescription = getFulfillmentStageDescription(order.orderStatus);
  order.statusTrail = getStatusTrail(order.orderStatus);
  order.branchReason = getBranchReason(order);
  order.nextActionSuggestion = getNextActionSuggestion(order);
  order.processingProfile = buildShopeeProcessingProfile(order);
}

export function applyOrderOperation(
  action: string,
  payload: ERP.OrderOperationPayload,
): ERP.ApiResponse<{ affected: number }> {
  const targetIds = payload.orderIds?.length
    ? payload.orderIds
    : payload.orderId
      ? [payload.orderId]
      : payload.orderNo
        ? mockOrders.filter((item) => item.orderNo === payload.orderNo).map((item) => item.id)
        : [];

  mockOrders.forEach((order) => {
    if (!targetIds.includes(order.id)) return;

    switch (action) {
      case 'audit':
        order.auditStatus = 'APPROVED';
        order.orderStatus = 'READY_TO_SHIP';
        order.currentStatus = 'RESOLVED';
        break;
      case 'invoice-add':
        order.invoiceInfo = {
          number: payload.invoiceData?.number || '',
          seriesNumber: payload.invoiceData?.seriesNumber || '-',
          accessKey: payload.invoiceData?.accessKey || '',
          issueDate: payload.invoiceData?.issueDate || now(),
          totalValue: payload.invoiceData?.totalValue || order.totalAmount,
          productsTotalValue:
            payload.invoiceData?.productsTotalValue || payload.invoiceData?.totalValue || order.totalAmount,
          taxCode: payload.invoiceData?.taxCode || '-',
        };
        if (order.orderStatus === 'PENDING_INVOICE') {
          order.orderStatus = 'READY_TO_SHIP';
          order.platformStatus = 'READY_TO_SHIP';
          order.packageFulfillmentStatus = 'READY_TO_SHIP';
          order.packageStatus = 'TO_PROCESS';
          order.logisticsStatus = 'LOGISTICS_READY';
          order.dispatchRecommendation = '发票已补齐，可继续准备物流并安排出货。';
          order.branchReason = undefined;
        }
        break;
      case 'reverse-audit':
        order.auditStatus = 'REVERSED';
        order.orderStatus = 'READY_TO_SHIP';
        break;
      case 'remark':
        order.remark = payload.remark || '';
        order.sellerNote = payload.remark || '';
        break;
      case 'address/update':
        if (payload.addressInfo) {
          order.addressInfo = payload.addressInfo;
          order.currentStatus = 'RECHECKING';
          if (order.orderStatus === 'RETRY_SHIP') {
            order.branchReason = '已更新收件地址，等待重新安排 shipment。';
          }
        }
        break;
      case 'lock':
        order.locked = true;
        order.auditStatus = 'LOCKED';
        order.warehouseStatus = 'LOCKED';
        break;
      case 'unlock':
      case 'warehouse-unlock':
        order.locked = false;
        order.auditStatus = order.orderStatus === 'READY_TO_SHIP' ? 'PENDING' : 'APPROVED';
        if (order.warehouseStatus === 'LOCKED') {
          order.warehouseStatus = 'PENDING';
        }
        break;
      case 'warehouse-lock':
        order.locked = true;
        order.warehouseStatus = 'LOCKED';
        break;
      case 'split':
      case 'merge':
        break;
      case 'assign-warehouse':
      case 'reassign-warehouse':
        if (payload.warehouseName) {
          order.warehouseName = payload.warehouseName;
          order.recommendedWarehouse = payload.warehouseName;
          order.warehouseStatus = 'ASSIGNED';
          order.warehouseAssignedAt = now();
          order.allocationReason =
            action === 'reassign-warehouse' ? '根据最新库存重新分仓' : '人工分仓完成';
        }
        break;
      case 'select-logistics':
      case 'assign-logistics-channel':
        order.logisticsCompany = payload.logisticsCompany || order.logisticsCompany;
        order.logisticsChannel = payload.logisticsChannel || order.logisticsChannel;
        order.shippingCarrier = order.logisticsCompany;
        order.checkoutShippingCarrier = order.logisticsChannel;
        order.logisticsStatus = order.orderStatus === 'RETRY_SHIP'
          ? 'LOGISTICS_PICKUP_RETRY'
          : 'LOGISTICS_READY';
        order.logisticsAssignedAt = now();
        order.dispatchRecommendation = `已选择 ${order.logisticsCompany} / ${order.logisticsChannel}，可继续调用 ship_order。`;
        break;
      case 'generate-waybill':
        order.logisticsStatus = order.orderStatus === 'RETRY_SHIP'
          ? 'LOGISTICS_PICKUP_RETRY'
          : 'LOGISTICS_READY';
        order.trackingNo = payload.trackingNo || `TRK${Date.now().toString().slice(-8)}`;
        order.logisticsAssignedAt = now();
        break;
      case 'mark-logistics-assigned':
        order.logisticsStatus = order.orderStatus === 'RETRY_SHIP'
          ? 'LOGISTICS_PICKUP_RETRY'
          : 'LOGISTICS_READY';
        order.logisticsAssignedAt = now();
        break;
      case 'rematch-logistics':
        order.orderStatus = 'RETRY_SHIP';
        order.logisticsCompany = pick(logisticsCompanies, Number(order.id.replace('ORDER-', '')) + 1);
        order.logisticsChannel = pick(logisticsChannels, Number(order.id.replace('ORDER-', '')) + 2);
        order.dispatchRecommendation = `重新匹配为 ${order.logisticsCompany} / ${order.logisticsChannel}`;
        order.shippingCarrier = order.logisticsCompany;
        order.checkoutShippingCarrier = order.logisticsChannel;
        order.logisticsStatus = 'LOGISTICS_PICKUP_RETRY';
        order.branchReason = '首次收件失败，已重新匹配物流等待再次履约。';
        break;
      case 'ship-order':
        order.orderStatus = 'PROCESSED';
        order.deliveryStatus = 'PROCESSED';
        order.logisticsStatus = 'LOGISTICS_REQUEST_CREATED';
        order.trackingNo = payload.trackingNo || order.trackingNo || `TRK${Date.now()}`;
        order.shippingCarrier = payload.logisticsCompany || order.shippingCarrier;
        order.logisticsInfo.trackingNo = order.trackingNo;
        order.logisticsInfo.shippedAt = undefined;
        break;
      case 'cancel':
        order.orderStatus = 'IN_CANCEL';
        order.branchReason = payload.reason || '买家发起取消申请，等待平台处理。';
        break;
      case 'manual-sync':
        if (order.orderStatus === 'PROCESSED') {
          order.orderStatus = 'SHIPPED';
          order.logisticsStatus = 'LOGISTICS_PICKUP_DONE';
          order.logisticsInfo.shippedAt = now();
        } else if (order.orderStatus === 'SHIPPED') {
          order.orderStatus = 'TO_CONFIRM_RECEIVE';
        } else if (order.orderStatus === 'TO_CONFIRM_RECEIVE') {
          order.orderStatus = 'COMPLETED';
          order.logisticsStatus = 'LOGISTICS_DELIVERY_DONE';
        } else if (order.orderStatus === 'IN_CANCEL') {
          order.orderStatus = 'CANCELLED';
          order.logisticsStatus = 'LOGISTICS_REQUEST_CANCELED';
        }
        order.currentStatus = 'RECHECKING';
        break;
      case 'after-sale':
        order.orderStatus = 'TO_RETURN';
        order.afterSaleStatus = 'IN_PROGRESS';
        order.branchReason = '订单已进入退货退款流程。';
        break;
      case 'tag':
        order.tags = payload.tags || order.tags;
        order.exceptionTags = payload.tags || order.exceptionTags;
        refreshRuleHitCount();
        break;
      case 'manual-review':
        order.currentStatus = 'MANUAL_REVIEW';
        break;
      case 'recheck':
        order.currentStatus = 'RECHECKING';
        break;
      case 'ignore-abnormal':
        order.currentStatus = 'IGNORED';
        break;
      default:
        break;
    }

    order.platformStatus = order.orderStatus;
    order.fulfillmentStage = getFulfillmentStage(order.orderStatus);
    order.fulfillmentStageDescription = getFulfillmentStageDescription(order.orderStatus);
    order.statusTrail = getStatusTrail(order.orderStatus);
    order.branchReason = getBranchReason(order) || order.branchReason;
    order.nextActionSuggestion = getNextActionSuggestion(order);
    order.deliveryStatus = getDeliveryStatusByOrderStatus(order.orderStatus);
    order.packageStatus = getPackageStatusByOrderStatus(order.orderStatus);
    order.packageFulfillmentStatus = getPackageFulfillmentStatusByOrderStatus(order.orderStatus);
    order.infoNeeded = getInfoNeededByOrderStatus(order.orderStatus);
    order.packageList = order.packageList.map((pkg) => ({
      ...pkg,
      packageStatus: order.packageStatus,
      packageFulfillmentStatus: order.packageFulfillmentStatus,
      fulfillmentStatus: order.packageFulfillmentStatus,
      logisticsStatus: order.logisticsStatus,
      shippingCarrier: order.shippingCarrier,
      trackingNumber: order.trackingNo !== '-' ? order.trackingNo : undefined,
      infoNeeded: order.infoNeeded,
      latestPackageUpdateTime: order.updateTime,
      dataSource: pkg.dataSource,
      realFieldList: pkg.realFieldList,
      pickupDoneTime:
        ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'].includes(order.orderStatus)
          ? order.logisticsInfo.shippedAt
          : undefined,
    }));
    order.packageCount = order.packageList.length;
    order.packageNumber = order.packageList[0]?.packageNumber || '-';
    order.shippingCarrier = order.logisticsCompany;
    order.checkoutShippingCarrier = order.logisticsChannel;
    order.pickupDoneTime = order.packageList[0]?.pickupDoneTime;
    order.lastSyncTime = order.updateTime;
    order.syncMeta = {
      ...order.syncMeta,
      lastSyncTime: order.updateTime,
      statusSource: 'REALTIME_SYNCED',
      packageSource: order.packageList.length ? 'REALTIME_SYNCED' : 'FALLBACK',
    };
    order.logisticsInfo.deliveryStatus = order.deliveryStatus;
    order.logisticsInfo.logisticsStatus = order.logisticsStatus;
    order.logisticsInfo.dispatchRecommendation = order.dispatchRecommendation;
    order.logisticsInfo.freightEstimate = order.freightEstimate;
    order.logisticsInfo.logisticsCompany = order.logisticsCompany;
    order.logisticsInfo.logisticsService = order.logisticsChannel;
    order.logisticsInfo.logisticsChannel = order.logisticsChannel;
    order.logisticsInfo.packageNumber = order.packageNumber;
    order.logisticsInfo.packageStatus = order.packageStatus;
    order.logisticsInfo.fulfillmentStatus = order.packageFulfillmentStatus;
    order.logisticsInfo.warehouseName = order.warehouseName;
    order.logisticsInfo.trackingNo = order.trackingNo;
    order.logisticsInfo.infoNeeded = order.infoNeeded;

    appendLog(order, action, payload.reason || payload.remark || '前端模拟操作成功');
    refreshPlatformProfile(order);
  });

  refreshRuleHitCount();

  return {
    success: true,
    data: { affected: targetIds.length },
  };
}

export function saveRule(payload: ERP.RuleSavePayload): ERP.ApiResponse<ERP.RuleConfigItem> {
  const existingIndex = mockRules.findIndex((item) => item.id === payload.id);
  const next: ERP.RuleConfigItem = {
    id: payload.id || `RULE-${Date.now()}`,
    ...payload,
    hitOrderCount:
      existingIndex >= 0 ? mockRules[existingIndex].hitOrderCount : 0,
    createdAt: existingIndex >= 0 ? mockRules[existingIndex].createdAt : now(),
    updatedAt: now(),
  };

  if (existingIndex >= 0) {
    mockRules[existingIndex] = next;
  } else {
    mockRules = [next, ...mockRules];
  }

  return {
    success: true,
    data: next,
  };
}

export function toggleRule(id: string): ERP.ApiResponse<ERP.RuleConfigItem> {
  const target = mockRules.find((item) => item.id === id || item.ruleCode === id) || mockRules[0];
  target.enabled = !target.enabled;
  target.updatedAt = now();
  return { success: true, data: target };
}

export function deleteRule(id: string): ERP.ApiResponse<{ id: string }> {
  mockRules = mockRules.filter((item) => item.id !== id && item.ruleCode !== id);
  return { success: true, data: { id } };
}

export function summarizeOrders(currentTab?: string): ERP.OrderOverview {
  const rows = currentTab ? filterOrders({ currentTab }) : mockOrders;
  return {
    total: rows.length,
    pendingCount: filterOrders({ currentTab: 'pending' }).length,
    pendingInvoiceCount: rows.filter((item) => item.orderStatus === 'PENDING_INVOICE').length,
    abnormalCount: filterOrders({ currentTab: 'abnormal' }).length,
    shippedCount: filterOrders({ currentTab: 'shipped' }).length,
    cancelRefundCount: filterOrders({ currentTab: 'cancelRefund' }).length,
    lockedCount: rows.filter((item) => item.locked).length,
    printPendingCount: rows.filter((item) => item.trackingNo === '-').length,
    logisticsPendingCount: rows.filter((item) => item.logisticsStatus === 'LOGISTICS_READY').length,
    warehousePendingCount: rows.filter((item) => item.warehouseStatus === 'PENDING').length,
    unpaidCount: rows.filter((item) => item.orderStatus === 'UNPAID').length,
    readyToShipCount: rows.filter((item) => item.orderStatus === 'READY_TO_SHIP').length,
    processedCount: rows.filter((item) => item.orderStatus === 'PROCESSED').length,
    toConfirmReceiveCount: rows.filter((item) => item.orderStatus === 'TO_CONFIRM_RECEIVE').length,
    inCancelCount: rows.filter((item) => item.orderStatus === 'IN_CANCEL').length,
    retryShipCount: rows.filter((item) => item.orderStatus === 'RETRY_SHIP').length,
    toReturnCount: rows.filter((item) => item.orderStatus === 'TO_RETURN').length,
    cancelledCount: rows.filter((item) => item.orderStatus === 'CANCELLED').length,
    completedCount: rows.filter((item) => item.orderStatus === 'COMPLETED').length,
  };
}
