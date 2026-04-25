function createBinding(
  actionKey: string,
  label: string,
  manager: string,
  method: string,
  endpoint: string,
  syncMode: ERP.PlatformSyncMode,
  available: boolean,
  reason?: string,
): ERP.OrderActionBinding {
  return {
    actionKey,
    label,
    manager,
    method,
    endpoint,
    syncMode,
    available,
    reason,
  };
}

type ShopeeOrderContext = Pick<
  ERP.OrderListItem,
  | 'platform'
  | 'platformChannel'
  | 'platformRegion'
  | 'platformShopId'
  | 'platformStatus'
  | 'orderStatus'
  | 'warehouseStatus'
  | 'logisticsStatus'
  | 'locked'
  | 'afterSaleStatus'
>;

export function getShopeePlatformStatus(order: Pick<ERP.OrderListItem, 'orderStatus'>) {
  return order.orderStatus;
}

export function buildShopeeProcessingProfile(
  order: ShopeeOrderContext,
): ERP.OrderProcessingProfile {
  const isClosed = ['CANCELLED', 'COMPLETED'].includes(order.orderStatus);
  const isPendingInvoice = order.orderStatus === 'PENDING_INVOICE';
  const canSyncRemark = !isClosed;
  const canAddInvoice =
    isPendingInvoice && !order.locked && !isClosed && order.afterSaleStatus === 'NONE';
  const canSplit =
    ['READY_TO_SHIP'].includes(order.orderStatus) &&
    !order.locked &&
    !isClosed &&
    order.afterSaleStatus === 'NONE';
  const canCancel = ['READY_TO_SHIP', 'IN_CANCEL'].includes(order.orderStatus);
  const canPrepareLogistics =
    ['READY_TO_SHIP', 'PROCESSED', 'RETRY_SHIP'].includes(order.orderStatus) &&
    !isPendingInvoice &&
    !order.locked &&
    order.afterSaleStatus === 'NONE';
  const canShip =
    ['READY_TO_SHIP', 'RETRY_SHIP'].includes(order.orderStatus) &&
    !isPendingInvoice &&
    order.warehouseStatus === 'ASSIGNED' &&
    !order.locked &&
    order.afterSaleStatus === 'NONE';
  const canHandleReturn =
    order.afterSaleStatus !== 'NONE' ||
    ['TO_RETURN', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'].includes(order.orderStatus);

  return {
    platform: 'SHOPEE',
    region: order.platformRegion || 'BR',
    shopId: order.platformShopId || '-',
    platformStatus: order.platformStatus || getShopeePlatformStatus(order),
    orderManager: '@congminh1254/shopee-sdk/managers/order.manager',
    logisticsManager: '@congminh1254/shopee-sdk/managers/logistics.manager',
    returnsManager: '@congminh1254/shopee-sdk/managers/returns.manager',
    primaryReadEndpoint: '/order/get_order_list',
    detailEndpoint: '/order/get_order_detail',
    shipmentEndpoint: '/order/get_shipment_list',
    logisticsEndpoint:
      '/logistics/get_shipping_parameter,/logistics/get_mass_shipping_parameter,/logistics/get_tracking_number,/logistics/get_mass_tracking_number,/logistics/ship_order,/logistics/batch_ship_order,/logistics/mass_ship_order,/logistics/update_shipping_order,/logistics/create_shipping_document,/logistics/get_shipping_document_parameter',
    invoiceEndpoint: '/order/add_invoice_data',
    returnsEndpoint: '/returns/get_return_list,/returns/get_return_detail',
    actionBindings: [
      createBinding(
        'syncOrders',
        '同步订单列表',
        'OrderManager',
        'getOrderList',
        '/order/get_order_list',
        'READ_FROM_SHOPEE',
        true,
      ),
      createBinding(
        'syncOrderDetail',
        '同步订单详情',
        'OrderManager',
        'getOrdersDetail',
        '/order/get_order_detail',
        'READ_FROM_SHOPEE',
        true,
      ),
      createBinding(
        'invoiceAdd',
        '补录发票',
        'OrderManager',
        'addInvoiceData',
        '/order/add_invoice_data',
        'SYNC_TO_SHOPEE',
        canAddInvoice,
        canAddInvoice
          ? undefined
          : isPendingInvoice
            ? '订单被锁定、已关闭或已进入售后，暂不能补录发票'
            : '仅 PENDING_INVOICE 的巴西站订单允许调用 add_invoice_data',
      ),
      createBinding(
        'remark',
        '同步卖家备注',
        'OrderManager',
        'setNote',
        '/order/set_note',
        'SYNC_TO_SHOPEE',
        canSyncRemark,
        canSyncRemark ? undefined : '已关闭订单不再回写 Shopee 备注',
      ),
      createBinding(
        'split',
        '拆单',
        'OrderManager',
        'splitOrder',
        '/order/split_order',
        'SYNC_TO_SHOPEE',
        canSplit,
        canSplit ? undefined : '仅 READY_TO_SHIP 且未安排出货的订单可同步 Shopee 拆单',
      ),
      createBinding(
        'merge',
        '恢复合包',
        'OrderManager',
        'unsplitOrder',
        '/order/unsplit_order',
        'SYNC_TO_SHOPEE',
        canSplit,
        canSplit ? undefined : '仅 READY_TO_SHIP 且未安排出货的订单可同步 Shopee 恢复合包',
      ),
      createBinding(
        'cancel',
        '取消订单',
        'OrderManager',
        'cancelOrder',
        '/order/cancel_order',
        'SYNC_TO_SHOPEE',
        canCancel,
        canCancel ? undefined : '仅 READY_TO_SHIP 或 IN_CANCEL 阶段允许继续处理 Shopee 取消',
      ),
      createBinding(
        'logistics',
        '初始化物流',
        'LogisticsManager',
        'getShippingParameter',
        '/logistics/get_shipping_parameter',
        'READ_FROM_SHOPEE',
        canPrepareLogistics,
        canPrepareLogistics ? undefined : '需处于 READY_TO_SHIP / PROCESSED / RETRY_SHIP，且未锁定、未售后',
      ),
      createBinding(
        'tracking',
        '获取运单号',
        'LogisticsManager',
        'getTrackingNumber',
        '/logistics/get_tracking_number',
        'READ_FROM_SHOPEE',
        canPrepareLogistics,
        canPrepareLogistics ? undefined : '需处于 READY_TO_SHIP / PROCESSED / RETRY_SHIP，且未锁定、未售后',
      ),
      createBinding(
        'waybill',
        '生成面单',
        'LogisticsManager',
        'createShippingDocument',
        '/logistics/create_shipping_document',
        'SYNC_TO_SHOPEE',
        canPrepareLogistics,
        canPrepareLogistics
          ? undefined
          : isPendingInvoice
            ? '订单仍处于待补发票状态，需先调用 add_invoice_data 进入 READY_TO_SHIP'
            : '需处于 READY_TO_SHIP / PROCESSED / RETRY_SHIP，且未锁定、未售后',
      ),
      createBinding(
        'shipment',
        '安排出货',
        'LogisticsManager',
        'shipOrder',
        '/logistics/ship_order',
        'SYNC_TO_SHOPEE',
        canShip,
        canShip
          ? undefined
          : isPendingInvoice
            ? '订单仍处于待补发票状态，需先补发票后才能安排出货'
            : '仅 READY_TO_SHIP / RETRY_SHIP、已分仓且未锁定订单可进入正式 ship 链路；具体 pickup/dropoff/non_integrated 校验由后端 precheck 处理',
      ),
      createBinding(
        'returnList',
        '读取售后单列表',
        'ReturnsManager',
        'getReturnList',
        '/returns/get_return_list',
        'READ_FROM_SHOPEE',
        true,
      ),
      createBinding(
        'returnDetail',
        '读取售后单详情',
        'ReturnsManager',
        'getReturnDetail',
        '/returns/get_return_detail',
        'READ_FROM_SHOPEE',
        canHandleReturn,
        canHandleReturn ? undefined : '当前订单未进入 Shopee 售后或退货退款流程',
      ),
    ],
  };
}

export function ensureOrderPlatformProfile<T extends Omit<ERP.OrderListItem, 'processingProfile'> & {
  processingProfile?: ERP.OrderProcessingProfile;
}>(order: T): T & { processingProfile: ERP.OrderProcessingProfile } {
  const normalized = {
    ...order,
    platform: order.platform || 'Shopee',
    platformChannel: order.platformChannel || 'SHOPEE',
    platformRegion: order.platformRegion || 'BR',
    platformShopId: order.platformShopId || '-',
    platformStatus: order.platformStatus || getShopeePlatformStatus(order),
  };

  return {
    ...normalized,
    processingProfile: order.processingProfile || buildShopeeProcessingProfile(normalized),
  };
}

export function getActionBinding(
  profile: ERP.OrderProcessingProfile | undefined,
  actionKey: string,
) {
  return profile?.actionBindings.find((item) => item.actionKey === actionKey);
}
