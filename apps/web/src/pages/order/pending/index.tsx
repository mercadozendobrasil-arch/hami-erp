import React from 'react';
import OrderStatusPage from '../components/OrderStatusPage';

const PendingOrderPage: React.FC = () => {
  return (
    <OrderStatusPage
      title="待处理订单"
      subTitle="聚合 UNPAID、PENDING_INVOICE、READY_TO_SHIP、PROCESSED、RETRY_SHIP、IN_CANCEL、TO_RETURN 等 Shopee 待处理状态。"
      headerTitle="待处理订单池"
      currentTab="pending"
      alertType="info"
      alertMessage="当前页聚合 Shopee 主链路中的全部待处理状态"
      alertDescription="适合运营、审单、仓配团队统一查看从待付款、待补发票、待出货到异常分支的处理进度。"
    />
  );
};

export default PendingOrderPage;
