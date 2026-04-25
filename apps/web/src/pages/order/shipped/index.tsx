import React from 'react';
import OrderStatusPage from '../components/OrderStatusPage';

const ShippedOrderPage: React.FC = () => {
  return (
    <OrderStatusPage
      title="已发货订单"
      subTitle="跟踪 SHIPPED、TO_CONFIRM_RECEIVE、COMPLETED 三个 Shopee 发货后阶段。"
      headerTitle="已发货订单"
      currentTab="shipped"
      alertType="success"
      alertMessage="已发货订单用于物流追踪、签收回传和完结确认"
      alertDescription="该页重点查看包裹妥投前后状态，不再把 READY_TO_SHIP / PROCESSED 混入已发货视图。"
    />
  );
};

export default ShippedOrderPage;
