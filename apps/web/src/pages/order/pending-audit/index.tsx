import React from 'react';
import OrderStatusPage from '../components/OrderStatusPage';

const PendingAuditOrderPage: React.FC = () => {
  return (
    <OrderStatusPage
      title="待审核订单"
      subTitle="聚焦 Shopee READY_TO_SHIP 状态下仍待 ERP 审核确认的订单。"
      headerTitle="待审核订单"
      currentTab="pendingAudit"
      alertType="warning"
      alertMessage="READY_TO_SHIP 订单需要优先审核"
      alertDescription="审核通过后才能继续分仓、匹配物流并推进 shipment。"
    />
  );
};

export default PendingAuditOrderPage;
