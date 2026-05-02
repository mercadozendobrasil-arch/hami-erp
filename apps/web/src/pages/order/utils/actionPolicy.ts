import {
  LOGISTICS_MANAGEABLE_STATUSES,
  PRE_SHIPMENT_STATUSES,
  SHIPPED_VIEW_STATUSES,
  TERMINAL_STATUSES,
} from '@/services/erp/orderFlow';

export type OrderActionKey =
  | 'invoice'
  | 'audit'
  | 'reverseAudit'
  | 'remark'
  | 'address'
  | 'lock'
  | 'unlock'
  | 'split'
  | 'merge'
  | 'warehouse'
  | 'logistics'
  | 'shipment'
  | 'cancel'
  | 'afterSale'
  | 'manualSync'
  | 'tag';

export type OrderActionPolicyItem = {
  key: OrderActionKey;
  visible: boolean;
  disabled: boolean;
  reason?: string;
};

type PolicyContext = {
  currentTab?: string;
  orders: ERP.OrderListItem[];
  isBatch?: boolean;
};

const ALL_ACTIONS: OrderActionKey[] = [
  'invoice',
  'audit',
  'reverseAudit',
  'remark',
  'address',
  'lock',
  'unlock',
  'split',
  'merge',
  'warehouse',
  'logistics',
  'shipment',
  'cancel',
  'afterSale',
  'manualSync',
  'tag',
];

const ACTION_BINDING_MAP: Partial<Record<OrderActionKey, string[]>> = {
  invoice: ['invoiceAdd'],
  remark: ['remark'],
  split: ['split'],
  merge: ['merge'],
  logistics: ['logistics', 'tracking', 'waybill'],
  shipment: ['shipment'],
  cancel: ['cancel'],
  afterSale: ['returnList', 'returnDetail'],
  manualSync: ['syncOrders', 'syncOrderDetail'],
};

function anyMatch(orders: ERP.OrderListItem[], matcher: (order: ERP.OrderListItem) => boolean) {
  return orders.some(matcher);
}

function allMatch(orders: ERP.OrderListItem[], matcher: (order: ERP.OrderListItem) => boolean) {
  return orders.every(matcher);
}

function getPlatformConstraint(orders: ERP.OrderListItem[], key: OrderActionKey) {
  const bindingKeys = ACTION_BINDING_MAP[key];
  if (!bindingKeys?.length || orders.length === 0) {
    return { disabled: false as const };
  }

  const invalidOrder = orders.find((order) =>
    bindingKeys.some((bindingKey) => {
      const binding = order.processingProfile?.actionBindings.find(
        (item) => item.actionKey === bindingKey,
      );
      return binding ? !binding.available : false;
    }),
  );

  if (!invalidOrder) {
    return { disabled: false as const };
  }

  const invalidBinding = invalidOrder.processingProfile.actionBindings.find(
    (item) => bindingKeys.includes(item.actionKey) && !item.available,
  );

  return {
    disabled: true as const,
    reason: invalidBinding?.reason || '当前订单在平台侧不可执行该动作',
  };
}

function isClosed(order: ERP.OrderListItem) {
  return TERMINAL_STATUSES.includes(order.orderStatus);
}

function isShipmentLocked(order: ERP.OrderListItem) {
  return (
    SHIPPED_VIEW_STATUSES.includes(order.orderStatus) ||
    ['IN_CANCEL', 'CANCELLED', 'TO_RETURN'].includes(order.orderStatus)
  );
}

function isPendingInvoice(order: ERP.OrderListItem) {
  return (
    order.orderStatus === 'PENDING_INVOICE' ||
    order.fulfillmentStage === 'pending_invoice'
  );
}

export function getOrderActionPolicies({
  currentTab,
  orders,
  isBatch = false,
}: PolicyContext): OrderActionPolicyItem[] {
  return ALL_ACTIONS.map((key) => {
    let visible = true;
    let disabled = false;
    let reason = '';

    const hasOrders = orders.length > 0;
    const single = orders[0];

    switch (key) {
      case 'invoice':
        visible =
          !isBatch &&
          anyMatch(orders, (order) => isPendingInvoice(order));
        disabled =
          !single ||
          !isPendingInvoice(single) ||
          single.locked ||
          single.afterSaleStatus !== 'NONE';
        reason = !single
          ? '请选择订单'
          : '仅 PENDING_INVOICE 且未锁定、未进入售后的订单可补发票';
        break;
      case 'audit':
        visible =
          currentTab === 'pendingAudit' ||
          anyMatch(orders, (order) => order.orderStatus === 'READY_TO_SHIP');
        disabled =
          !hasOrders ||
          !allMatch(
            orders,
            (order) =>
              order.orderStatus === 'READY_TO_SHIP' &&
              order.auditStatus === 'PENDING' &&
              !order.locked &&
              order.afterSaleStatus === 'NONE',
          );
        reason = !hasOrders ? '请选择订单' : '仅 READY_TO_SHIP 且待审核的订单可审核';
        break;
      case 'reverseAudit':
        visible = anyMatch(orders, (order) => order.orderStatus === 'READY_TO_SHIP');
        disabled =
          !hasOrders ||
          !allMatch(
            orders,
            (order) =>
              order.orderStatus === 'READY_TO_SHIP' &&
              order.auditStatus === 'APPROVED' &&
              !order.locked,
          );
        reason = !hasOrders ? '请选择订单' : '仅 READY_TO_SHIP 且已审核订单可反审核';
        break;
      case 'remark':
        visible = true;
        disabled = !hasOrders;
        reason = '请选择订单';
        break;
      case 'address':
        visible =
          !isBatch &&
          anyMatch(
            orders,
            (order) =>
              ['READY_TO_SHIP', 'RETRY_SHIP'].includes(order.orderStatus) ||
              (currentTab === 'abnormal' && !!order.exceptionTags.length),
          );
        disabled =
          !single ||
          !['READY_TO_SHIP', 'RETRY_SHIP'].includes(single.orderStatus) ||
          single.locked;
        reason = !single
          ? '请选择订单'
          : '仅 READY_TO_SHIP / RETRY_SHIP 且未锁定订单可修改地址';
        break;
      case 'lock':
        visible = anyMatch(orders, (order) => PRE_SHIPMENT_STATUSES.includes(order.orderStatus));
        disabled =
          !hasOrders ||
          !allMatch(
            orders,
            (order) =>
              PRE_SHIPMENT_STATUSES.includes(order.orderStatus) &&
              !order.locked &&
              order.afterSaleStatus === 'NONE',
          );
        reason = !hasOrders ? '请选择订单' : '仅 READY_TO_SHIP / RETRY_SHIP 且未锁定订单可锁定';
        break;
      case 'unlock':
        visible = anyMatch(orders, (order) => order.locked);
        disabled = !hasOrders || !allMatch(orders, (order) => order.locked);
        reason = !hasOrders ? '请选择订单' : '仅锁定订单可解锁';
        break;
      case 'split':
      case 'merge':
        visible =
          currentTab === 'pendingShipment' ||
          currentTab === 'abnormal' ||
          anyMatch(orders, (order) => PRE_SHIPMENT_STATUSES.includes(order.orderStatus));
        disabled =
          !hasOrders ||
          !allMatch(
            orders,
            (order) =>
              order.orderStatus === 'READY_TO_SHIP' &&
              !order.locked &&
              order.afterSaleStatus === 'NONE',
          );
        reason = !hasOrders ? '请选择订单' : '仅 READY_TO_SHIP 且未安排出货的订单可拆单或恢复合包';
        break;
      case 'warehouse':
        visible =
          currentTab === 'pendingShipment' ||
          currentTab === 'abnormal' ||
          currentTab === 'warehouse' ||
          anyMatch(orders, (order) => PRE_SHIPMENT_STATUSES.includes(order.orderStatus));
        disabled =
          !hasOrders ||
          !allMatch(
            orders,
            (order) =>
              PRE_SHIPMENT_STATUSES.includes(order.orderStatus) &&
              !order.locked &&
              !isShipmentLocked(order) &&
              order.afterSaleStatus === 'NONE',
          );
        reason = !hasOrders ? '请选择订单' : '仅 READY_TO_SHIP / RETRY_SHIP 且未锁定订单可分仓或重分仓';
        break;
      case 'logistics':
        visible =
          currentTab === 'pendingShipment' ||
          currentTab === 'logistics' ||
          anyMatch(orders, (order) => LOGISTICS_MANAGEABLE_STATUSES.includes(order.orderStatus));
        disabled =
          !hasOrders ||
          !allMatch(
            orders,
            (order) =>
              LOGISTICS_MANAGEABLE_STATUSES.includes(order.orderStatus) &&
              !order.locked &&
              order.afterSaleStatus === 'NONE',
          );
        reason =
          !hasOrders
            ? '请选择订单'
            : '需处于 READY_TO_SHIP / PROCESSED / RETRY_SHIP，且未锁定、未售后';
        break;
      case 'shipment':
        visible =
          currentTab === 'pendingShipment' ||
          currentTab === 'logistics' ||
          anyMatch(orders, (order) => PRE_SHIPMENT_STATUSES.includes(order.orderStatus));
        disabled =
          !hasOrders ||
          !allMatch(
            orders,
            (order) =>
              PRE_SHIPMENT_STATUSES.includes(order.orderStatus) &&
              order.warehouseStatus === 'ASSIGNED' &&
              ['LOGISTICS_READY', 'LOGISTICS_PENDING_ARRANGE', 'LOGISTICS_PICKUP_RETRY'].includes(
                order.logisticsStatus,
              ) &&
              !order.locked &&
              order.afterSaleStatus === 'NONE',
          );
        reason =
          !hasOrders
            ? '请选择订单'
            : '仅 READY_TO_SHIP / RETRY_SHIP 且已完成分仓和物流准备的订单可安排出货';
        break;
      case 'cancel':
        visible =
          currentTab === 'cancelRefund' ||
          anyMatch(orders, (order) => ['READY_TO_SHIP', 'IN_CANCEL'].includes(order.orderStatus));
        disabled =
          !hasOrders ||
          !allMatch(
            orders,
            (order) => ['READY_TO_SHIP', 'IN_CANCEL'].includes(order.orderStatus) && !order.locked,
          );
        reason = !hasOrders ? '请选择订单' : '仅 READY_TO_SHIP / IN_CANCEL 订单可处理取消';
        break;
      case 'afterSale':
        visible =
          currentTab === 'afterSale' ||
          anyMatch(orders, (order) =>
            ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED', 'TO_RETURN'].includes(order.orderStatus),
          );
        disabled =
          !hasOrders ||
          !allMatch(
            orders,
            (order) =>
              ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'].includes(order.orderStatus) &&
              order.afterSaleStatus === 'NONE',
          );
        reason =
          !hasOrders
            ? '请选择订单'
            : '仅已发货、待确认收货或已完成且未进入售后的订单可发起售后';
        break;
      case 'manualSync':
        visible = true;
        disabled = !hasOrders;
        reason = '请选择订单';
        break;
      case 'tag':
        visible = anyMatch(
          orders,
          (order) => LOGISTICS_MANAGEABLE_STATUSES.includes(order.orderStatus),
        );
        disabled =
          !hasOrders ||
          !allMatch(
            orders,
            (order) =>
              LOGISTICS_MANAGEABLE_STATUSES.includes(order.orderStatus) &&
              !isClosed(order),
          );
        reason = !hasOrders ? '请选择订单' : '仅待出货、已安排出货或重新出货状态支持打标签';
        break;
      default:
        break;
    }

    if (single && key !== 'remark' && key !== 'manualSync' && key !== 'afterSale') {
      if (single.orderStatus === 'UNPAID') {
        visible = ['remark', 'manualSync'].includes(key);
      }
      if (isPendingInvoice(single)) {
        if (!['invoice', 'remark', 'manualSync'].includes(key)) {
          visible = false;
        }
      }
      if (['SHIPPED', 'TO_CONFIRM_RECEIVE', 'COMPLETED'].includes(single.orderStatus)) {
        if (!['remark', 'afterSale', 'manualSync'].includes(key)) {
          visible = false;
        }
      }
      if (single.orderStatus === 'CANCELLED') {
        if (!['remark', 'manualSync'].includes(key)) {
          visible = false;
        }
      }
      if (single.orderStatus === 'TO_RETURN') {
        if (!['remark', 'afterSale', 'manualSync'].includes(key)) {
          visible = false;
        }
      }
      if (single.orderStatus === 'IN_CANCEL') {
        if (!['remark', 'cancel', 'manualSync'].includes(key)) {
          visible = false;
        }
      }
      if (single.orderStatus === 'RETRY_SHIP') {
        if (
          !['remark', 'address', 'warehouse', 'logistics', 'shipment', 'tag', 'manualSync'].includes(
            key,
          )
        ) {
          visible = false;
        }
      }
    }

    const platformConstraint = getPlatformConstraint(orders, key);
    if (!disabled && platformConstraint.disabled) {
      disabled = true;
      reason = platformConstraint.reason || reason;
    }

    return {
      key,
      visible,
      disabled,
      reason: disabled ? reason : undefined,
    };
  }).filter((item) => item.visible);
}
