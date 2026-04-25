import React from 'react';
import OrderStatusPage from '../components/OrderStatusPage';

const CancelRefundOrderPage: React.FC = () => {
  return (
    <OrderStatusPage
      title="取消/退款订单"
      subTitle="统一查看 IN_CANCEL、CANCELLED、TO_RETURN 三类取消和逆向流程订单。"
      headerTitle="取消/退款订单"
      currentTab="cancelRefund"
      alertType="warning"
      alertMessage="取消和退货退款订单建议与售后流程联动处理"
      alertDescription="可结合售后管理页继续跟踪取消申请、退款状态、取消发起方与逆向包裹处理。"
    />
  );
};

export default CancelRefundOrderPage;
