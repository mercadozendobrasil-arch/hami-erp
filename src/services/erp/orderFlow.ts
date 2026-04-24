export const SHOPEE_ORDER_STATUS_FLOW: ERP.OrderStatus[] = [
  'UNPAID',
  'PENDING_INVOICE',
  'READY_TO_SHIP',
  'PROCESSED',
  'SHIPPED',
  'TO_CONFIRM_RECEIVE',
  'COMPLETED',
];

export const PRE_SHIPMENT_STATUSES: ERP.OrderStatus[] = [
  'READY_TO_SHIP',
  'RETRY_SHIP',
];

export const LOGISTICS_MANAGEABLE_STATUSES: ERP.OrderStatus[] = [
  'READY_TO_SHIP',
  'PROCESSED',
  'RETRY_SHIP',
];

export const SHIPPED_VIEW_STATUSES: ERP.OrderStatus[] = [
  'SHIPPED',
  'TO_CONFIRM_RECEIVE',
  'COMPLETED',
];

export const CANCEL_REFUND_STATUSES: ERP.OrderStatus[] = [
  'IN_CANCEL',
  'CANCELLED',
  'TO_RETURN',
];

export const TERMINAL_STATUSES: ERP.OrderStatus[] = ['COMPLETED', 'CANCELLED'];

export const ABNORMAL_BRANCH_STATUSES: ERP.OrderStatus[] = [
  'IN_CANCEL',
  'RETRY_SHIP',
  'TO_RETURN',
];

export const SHOPEE_PACKAGE_STATUS_FLOW: ERP.ShopeePackageStatus[] = [
  'PENDING',
  'TO_PROCESS',
  'PROCESSED',
];

export function getPackageStatusByOrderStatus(
  status: ERP.OrderStatus,
): ERP.ShopeePackageStatus {
  switch (status) {
    case 'UNPAID':
    case 'PENDING_INVOICE':
      return 'PENDING';
    case 'READY_TO_SHIP':
    case 'RETRY_SHIP':
      return 'TO_PROCESS';
    default:
      return 'PROCESSED';
  }
}

export function getPackageFulfillmentStatusByOrderStatus(status: ERP.OrderStatus) {
  switch (status) {
    case 'UNPAID':
    case 'PENDING_INVOICE':
      return 'INITIAL';
    case 'IN_CANCEL':
      return 'CANCEL_PENDING';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return status;
  }
}

export function getShopeeLogisticsStatusByOrderStatus(
  status: ERP.OrderStatus,
): ERP.ShopeeLogisticsStatus {
  switch (status) {
    case 'UNPAID':
      return 'LOGISTICS_NOT_START';
    case 'PENDING_INVOICE':
      return 'LOGISTICS_PENDING_ARRANGE';
    case 'READY_TO_SHIP':
      return 'LOGISTICS_READY';
    case 'PROCESSED':
      return 'LOGISTICS_REQUEST_CREATED';
    case 'SHIPPED':
    case 'TO_CONFIRM_RECEIVE':
      return 'LOGISTICS_PICKUP_DONE';
    case 'COMPLETED':
      return 'LOGISTICS_DELIVERY_DONE';
    case 'IN_CANCEL':
      return 'LOGISTICS_REQUEST_CANCELED';
    case 'CANCELLED':
      return 'LOGISTICS_INVALID';
    case 'RETRY_SHIP':
      return 'LOGISTICS_PICKUP_RETRY';
    case 'TO_RETURN':
      return 'LOGISTICS_DELIVERY_DONE';
    default:
      return 'LOGISTICS_PENDING_ARRANGE';
  }
}

export function getInfoNeededByOrderStatus(
  status: ERP.OrderStatus,
): ERP.ShopeeShippingInfoNeeded[] {
  switch (status) {
    case 'PENDING_INVOICE':
      return [];
    case 'READY_TO_SHIP':
      return ['pickup'];
    case 'RETRY_SHIP':
      return ['pickup', 'dropoff'];
    case 'PROCESSED':
      return ['pickup'];
    default:
      return [];
  }
}

export function getFulfillmentStage(status: ERP.OrderStatus): ERP.FulfillmentStage {
  switch (status) {
    case 'UNPAID':
      return 'PAYMENT_PENDING';
    case 'PENDING_INVOICE':
      return 'INVOICE_PENDING';
    case 'READY_TO_SHIP':
      return 'READY_FOR_SHIPMENT';
    case 'PROCESSED':
      return 'SHIPMENT_PROCESSING';
    case 'SHIPPED':
      return 'IN_TRANSIT';
    case 'TO_CONFIRM_RECEIVE':
      return 'WAITING_RECEIPT';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'IN_CANCEL':
      return 'CANCEL_PROCESSING';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'RETRY_SHIP':
      return 'RETRY_SHIPMENT';
    case 'TO_RETURN':
      return 'RETURN_PROCESSING';
    default:
      return 'READY_FOR_SHIPMENT';
  }
}

export function getDeliveryStatusByOrderStatus(status: ERP.OrderStatus): ERP.DeliveryStatus {
  switch (status) {
    case 'PENDING_INVOICE':
      return 'PENDING';
    case 'READY_TO_SHIP':
      return 'READY_TO_SHIP';
    case 'PROCESSED':
      return 'PROCESSED';
    case 'SHIPPED':
      return 'SHIPPED';
    case 'TO_CONFIRM_RECEIVE':
    case 'COMPLETED':
      return 'TO_CONFIRM_RECEIVE';
    case 'RETRY_SHIP':
      return 'RETRY_SHIP';
    case 'TO_RETURN':
      return 'TO_RETURN';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

export function getStatusTrail(status: ERP.OrderStatus): ERP.OrderStatus[] {
  switch (status) {
    case 'PENDING_INVOICE':
      return ['UNPAID', 'PENDING_INVOICE'];
    case 'IN_CANCEL':
      return ['READY_TO_SHIP', 'IN_CANCEL'];
    case 'CANCELLED':
      return ['READY_TO_SHIP', 'IN_CANCEL', 'CANCELLED'];
    case 'RETRY_SHIP':
      return ['READY_TO_SHIP', 'PROCESSED', 'RETRY_SHIP'];
    case 'TO_RETURN':
      return ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'TO_RETURN'];
    case 'TO_CONFIRM_RECEIVE':
      return SHOPEE_ORDER_STATUS_FLOW.slice(0, 5);
    case 'COMPLETED':
      return SHOPEE_ORDER_STATUS_FLOW;
    default: {
      const index = SHOPEE_ORDER_STATUS_FLOW.indexOf(status);
      return index >= 0 ? SHOPEE_ORDER_STATUS_FLOW.slice(0, index + 1) : [status];
    }
  }
}

export function getFulfillmentStageDescription(status: ERP.OrderStatus) {
  switch (status) {
    case 'UNPAID':
      return '订单尚未付款，Shopee 后台仍停留在支付等待阶段。';
    case 'PENDING_INVOICE':
      return '巴西站订单已付款，但在补录发票信息前不会进入 READY_TO_SHIP，需先调用 add_invoice_data。';
    case 'READY_TO_SHIP':
      return '买家已付款，卖家可以开始内部审核、准备包裹并调用 ship_order 安排出货。';
    case 'PROCESSED':
      return '卖家已经调用 ship_order 安排出货，Shopee 等待物流商揽收或首次扫描。';
    case 'SHIPPED':
      return '物流已揽收或完成首扫，订单已进入在途阶段。';
    case 'TO_CONFIRM_RECEIVE':
      return '包裹已送达待买家确认，前置履约动作应停止。';
    case 'COMPLETED':
      return 'Shopee 已确认订单闭环完成，仅保留查询和售后能力。';
    case 'IN_CANCEL':
      return '订单已进入取消申请处理分支，应优先处理取消原因和平台申请。';
    case 'CANCELLED':
      return '订单已在 Shopee 侧取消完成，不应再执行履约动作。';
    case 'RETRY_SHIP':
      return '首次收件或派送失败，需要重新安排取件、物流或履约。';
    case 'TO_RETURN':
      return '订单已进入退货退款分支，应切换到售后与退货处理流程。';
    default:
      return '-';
  }
}

type NextActionContext = Pick<
  ERP.OrderListItem,
  | 'orderStatus'
  | 'warehouseStatus'
  | 'logisticsStatus'
  | 'locked'
  | 'afterSaleStatus'
  | 'exceptionTags'
>;

export function getNextActionSuggestion(order: NextActionContext) {
  if (order.locked) {
    return '先解锁订单，再继续处理后续履约动作。';
  }

  switch (order.orderStatus) {
    case 'UNPAID':
      return '等待买家付款或手动同步 Shopee 状态。';
    case 'PENDING_INVOICE':
      return '先补齐发票号码、访问键和开票金额，再同步详情确认是否进入 READY_TO_SHIP。';
    case 'READY_TO_SHIP':
      if (order.warehouseStatus !== 'ASSIGNED') {
        return '优先完成审核和分仓，再安排物流。';
      }
      if (
        ['LOGISTICS_NOT_START', 'LOGISTICS_READY', 'LOGISTICS_PENDING_ARRANGE'].includes(
          order.logisticsStatus,
        )
      ) {
        return '调用 get_shipping_parameter 获取发货参数，并通过 ship_order 安排出货。';
      }
      return '物流参数已就绪，可继续调用 ship_order 推进到 PROCESSED。';
    case 'PROCESSED':
      if (order.logisticsStatus === 'LOGISTICS_REQUEST_CREATED') {
        return '等待 3PL 揽收或首扫，必要时调用 get_tracking_number / get_tracking_info 跟踪。';
      }
      return '持续跟踪揽收扫描结果，必要时再次同步平台。';
    case 'SHIPPED':
      return '跟踪物流轨迹，等待进入买家确认收货阶段。';
    case 'TO_CONFIRM_RECEIVE':
      return '等待买家确认收货，如有异常转入售后处理。';
    case 'COMPLETED':
      return '订单已闭环，如有争议仅处理备注和售后。';
    case 'IN_CANCEL':
      return '优先核对取消原因并处理 Shopee 取消申请。';
    case 'CANCELLED':
      return '订单已取消，保留查询、备注和日志审计。';
    case 'RETRY_SHIP':
      return '重新获取发货参数并再次调用 ship_order，等待新的包裹履约链路开始。';
    case 'TO_RETURN':
      return '转入售后处理，核对退货退款与逆向物流信息。';
    default:
      return '根据当前 Shopee 流程继续处理。';
  }
}

type BranchReasonContext = Pick<
  ERP.OrderListItem,
  'orderStatus' | 'exceptionReason' | 'exceptionTags' | 'suggestedAction'
>;

export function getBranchReason(order: BranchReasonContext) {
  switch (order.orderStatus) {
    case 'PENDING_INVOICE':
      return '巴西站订单待补发票，未完成 add_invoice_data 前不应进入正常物流履约。';
    case 'IN_CANCEL':
      return order.exceptionReason === '无异常'
        ? '买家或平台发起取消申请，等待卖家处理。'
        : order.exceptionReason;
    case 'RETRY_SHIP':
      return order.exceptionReason === '无异常'
        ? '首次派送或取件失败，需要重新履约。'
        : order.exceptionReason;
    case 'TO_RETURN':
      return order.exceptionReason === '无异常'
        ? '订单进入退货退款分支，需处理逆向履约。'
        : order.exceptionReason;
    default:
      return undefined;
  }
}
