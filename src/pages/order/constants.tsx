import { Tag } from 'antd';
import React from 'react';

export const ORDER_STATUS_OPTIONS: Record<ERP.OrderStatus, { text: string; color: string }> = {
  UNPAID: { text: '未付款', color: 'default' },
  PENDING_INVOICE: { text: '待补发票', color: 'orange' },
  READY_TO_SHIP: { text: '待出货', color: 'gold' },
  PROCESSED: { text: '已安排出货', color: 'processing' },
  SHIPPED: { text: '运输中', color: 'blue' },
  TO_CONFIRM_RECEIVE: { text: '待确认收货', color: 'cyan' },
  COMPLETED: { text: '已完成', color: 'success' },
  IN_CANCEL: { text: '取消中', color: 'volcano' },
  CANCELLED: { text: '已取消', color: 'default' },
  RETRY_SHIP: { text: '重新出货', color: 'orange' },
  TO_RETURN: { text: '退货退款中', color: 'magenta' },
};

export const PAY_STATUS_OPTIONS: Record<ERP.PayStatus, { text: string; color: string }> = {
  UNPAID: { text: '未支付', color: 'default' },
  PAID: { text: '已支付', color: 'success' },
  PART_REFUNDED: { text: '部分退款', color: 'gold' },
  REFUNDING: { text: '退款中', color: 'orange' },
  REFUNDED: { text: '已退款', color: 'default' },
};

export const SHOPEE_PLATFORM_STATUS_OPTIONS: Record<
  ERP.ShopeeOrderStatus,
  { text: string; color: string }
> = {
  ...ORDER_STATUS_OPTIONS,
};

export const AUDIT_STATUS_OPTIONS: Record<ERP.AuditStatus, { text: string; color: string }> = {
  PENDING: { text: '待内部审核', color: 'gold' },
  APPROVED: { text: '内部已审核', color: 'success' },
  REJECTED: { text: '审核驳回', color: 'error' },
  REVERSED: { text: '已反审核', color: 'default' },
  LOCKED: { text: '已锁定', color: 'volcano' },
};

export const PACKAGE_STATUS_OPTIONS: Record<
  ERP.ShopeePackageStatus,
  { text: string; color: string }
> = {
  PENDING: { text: '包裹待生成', color: 'default' },
  TO_PROCESS: { text: '待处理包裹', color: 'gold' },
  PROCESSED: { text: '已处理包裹', color: 'processing' },
};

export const PACKAGE_FULFILLMENT_STATUS_OPTIONS: Record<
  string,
  { text: string; color: string }
> = {
  INITIAL: { text: '初始', color: 'default' },
  PENDING_INVOICE: { text: '待补发票', color: 'orange' },
  READY_TO_SHIP: { text: '待出货', color: 'gold' },
  PROCESSED: { text: '已安排出货', color: 'processing' },
  SHIPPED: { text: '运输中', color: 'blue' },
  TO_CONFIRM_RECEIVE: { text: '待确认收货', color: 'cyan' },
  COMPLETED: { text: '已完成', color: 'success' },
  CANCEL_PENDING: { text: '取消处理中', color: 'volcano' },
  CANCELLED: { text: '已取消', color: 'default' },
  RETRY_SHIP: { text: '重新出货', color: 'orange' },
  TO_RETURN: { text: '退货退款中', color: 'magenta' },
};

export const AFTER_SALE_STATUS_OPTIONS: Record<
  ERP.AfterSaleStatus,
  { text: string; color: string }
> = {
  NONE: { text: '无售后', color: 'default' },
  IN_PROGRESS: { text: '处理中', color: 'orange' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'error' },
  REFUNDING: { text: '退款中', color: 'volcano' },
  REFUNDED: { text: '已退款', color: 'default' },
  COMPLETED: { text: '已完成', color: 'blue' },
};

export const EXCEPTION_TAG_OPTIONS: Record<
  ERP.OrderExceptionTag,
  { text: string; color: string }
> = {
  ADDRESS_EXCEPTION: { text: '地址异常', color: 'red' },
  OUT_OF_STOCK: { text: '缺货', color: 'orange' },
  HIGH_RISK: { text: '高风险', color: 'volcano' },
  SYNC_FAILED: { text: '平台同步失败', color: 'purple' },
  BLACKLIST_BUYER: { text: '黑名单买家', color: 'magenta' },
  TIMEOUT: { text: '超时未处理', color: 'gold' },
};

export const RISK_LEVEL_OPTIONS: Record<ERP.RiskLevel, { text: string; color: string }> = {
  LOW: { text: '低风险', color: 'default' },
  MEDIUM: { text: '中风险', color: 'gold' },
  HIGH: { text: '高风险', color: 'orange' },
  CRITICAL: { text: '严重', color: 'red' },
};

export const RULE_TYPE_OPTIONS: Record<ERP.RuleType, { text: string; color: string }> = {
  ADDRESS_VALIDATION: { text: '地址校验', color: 'red' },
  RISK_CONTROL: { text: '风控', color: 'volcano' },
  STOCK_ALLOCATION: { text: '库存/分仓', color: 'cyan' },
  PLATFORM_SYNC: { text: '平台同步', color: 'purple' },
  BUYER_CONTROL: { text: '买家风控', color: 'magenta' },
  TIMEOUT_ESCALATION: { text: '超时升级', color: 'gold' },
};

export const ABNORMAL_CURRENT_STATUS_OPTIONS: Record<
  ERP.AbnormalCurrentStatus,
  { text: string; color: string }
> = {
  PENDING_REVIEW: { text: '待处理', color: 'orange' },
  MANUAL_REVIEW: { text: '转人工', color: 'volcano' },
  RECHECKING: { text: '重新校验中', color: 'processing' },
  IGNORED: { text: '已忽略', color: 'default' },
  RESOLVED: { text: '已修复', color: 'success' },
};

export const LOGISTICS_STATUS_OPTIONS: Record<
  ERP.ShopeeLogisticsStatus,
  { text: string; color: string }
> = {
  LOGISTICS_NOT_START: { text: '物流未开始', color: 'default' },
  LOGISTICS_READY: { text: '物流参数已就绪', color: 'gold' },
  LOGISTICS_PENDING_ARRANGE: { text: '待安排发货', color: 'gold' },
  LOGISTICS_REQUEST_CREATED: { text: '已安排发货请求', color: 'processing' },
  LOGISTICS_PICKUP_DONE: { text: '已揽收/已首扫', color: 'blue' },
  LOGISTICS_PICKUP_RETRY: { text: '待重新揽收', color: 'orange' },
  LOGISTICS_PICKUP_FAILED: { text: '揽收失败', color: 'error' },
  LOGISTICS_DELIVERY_DONE: { text: '已妥投', color: 'success' },
  LOGISTICS_DELIVERY_FAILED: { text: '派送失败', color: 'error' },
  LOGISTICS_REQUEST_CANCELED: { text: '物流请求已取消', color: 'default' },
  LOGISTICS_COD_REJECTED: { text: 'COD 拒收', color: 'error' },
  LOGISTICS_INVALID: { text: '物流失效/订单取消', color: 'default' },
  LOGISTICS_LOST: { text: '包裹丢失', color: 'error' },
};

export const WAREHOUSE_STATUS_OPTIONS: Record<
  ERP.WarehouseStatus,
  { text: string; color: string }
> = {
  PENDING: { text: '待分仓', color: 'default' },
  ASSIGNED: { text: '已分仓', color: 'processing' },
  FAILED: { text: '分仓失败', color: 'error' },
  LOCKED: { text: '仓配锁定', color: 'volcano' },
  OUT_OF_STOCK: { text: '库存不足', color: 'orange' },
};

export const WAREHOUSE_OPTIONS = ['圣保罗一仓', '里约中转仓', '库里蒂巴备货仓'];
export const LOGISTICS_COMPANY_OPTIONS = [
  'Shopee Xpress',
  'Shopee Entrega Direta',
  'Correios',
  'Jadlog',
  'Loggi',
  'Total Express',
];
export const LOGISTICS_CHANNEL_OPTIONS = [
  'Shopee Xpress',
  'Shopee Entrega Direta',
  '标准快递',
  '经济快递',
  '当日优先',
  '敏感货专线',
];
export const SUGGESTED_ACTION_OPTIONS = [
  '等待买家付款',
  '补发票信息后再进入 READY_TO_SHIP',
  '完成内部审核并安排出货',
  '补齐物流信息后调用 ship_order',
  '跟踪物流并等待签收',
  '处理取消申请',
  '重新安排物流与取件',
  '转入退货退款处理',
];

export const ORDER_STATUS_VALUE_ENUM = Object.fromEntries(
  Object.entries(ORDER_STATUS_OPTIONS).map(([key, value]) => [
    key,
    {
      text: value.text,
      status: 'Default',
    },
  ]),
);

export const PAY_STATUS_VALUE_ENUM = Object.fromEntries(
  Object.entries(PAY_STATUS_OPTIONS).map(([key, value]) => [
    key,
    {
      text: value.text,
      status: 'Default',
    },
  ]),
);

export const PACKAGE_STATUS_VALUE_ENUM = Object.fromEntries(
  Object.entries(PACKAGE_STATUS_OPTIONS).map(([key, value]) => [
    key,
    {
      text: value.text,
      status: 'Default',
    },
  ]),
);

export const PACKAGE_FULFILLMENT_STATUS_VALUE_ENUM = Object.fromEntries(
  Object.entries(PACKAGE_FULFILLMENT_STATUS_OPTIONS).map(([key, value]) => [
    key,
    {
      text: value.text,
      status: 'Default',
    },
  ]),
);

export const AFTER_SALE_STATUS_VALUE_ENUM = Object.fromEntries(
  Object.entries(AFTER_SALE_STATUS_OPTIONS).map(([key, value]) => [
    key,
    {
      text: value.text,
      status: 'Default',
    },
  ]),
);

export const RISK_LEVEL_VALUE_ENUM = Object.fromEntries(
  Object.entries(RISK_LEVEL_OPTIONS).map(([key, value]) => [
    key,
    {
      text: value.text,
      status: 'Default',
    },
  ]),
);

export const LOGISTICS_STATUS_VALUE_ENUM = Object.fromEntries(
  Object.entries(LOGISTICS_STATUS_OPTIONS).map(([key, value]) => [
    key,
    {
      text: value.text,
      status: 'Default',
    },
  ]),
);

export const WAREHOUSE_STATUS_VALUE_ENUM = Object.fromEntries(
  Object.entries(WAREHOUSE_STATUS_OPTIONS).map(([key, value]) => [
    key,
    {
      text: value.text,
      status: 'Default',
    },
  ]),
);

export const ABNORMAL_CURRENT_STATUS_VALUE_ENUM = Object.fromEntries(
  Object.entries(ABNORMAL_CURRENT_STATUS_OPTIONS).map(([key, value]) => [
    key,
    {
      text: value.text,
      status: 'Default',
    },
  ]),
);

export function renderStatusTag(
  value: string,
  options: Record<string, { text: string; color: string }>,
) {
  const config = options[value];
  if (!config) {
    return <Tag>{value}</Tag>;
  }
  return <Tag color={config.color}>{config.text}</Tag>;
}

export function renderExceptionTags(tags: ERP.OrderExceptionTag[]) {
  if (!tags.length) {
    return '-';
  }

  return (
    <>
      {tags.map((tag) => (
        <Tag key={tag} color={EXCEPTION_TAG_OPTIONS[tag].color}>
          {EXCEPTION_TAG_OPTIONS[tag].text}
        </Tag>
      ))}
    </>
  );
}
