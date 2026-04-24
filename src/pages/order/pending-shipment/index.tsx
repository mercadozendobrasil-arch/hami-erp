import React from 'react';
import OrderStatusPage from '../components/OrderStatusPage';

const PendingShipmentOrderPage: React.FC = () => {
  return (
    <OrderStatusPage
      title="待出货订单"
      subTitle="聚焦 READY_TO_SHIP、PROCESSED、RETRY_SHIP 中与出货、包装和物流准备相关的订单，PENDING_INVOICE 不进入该池。"
      headerTitle="待出货订单"
      currentTab="pendingShipment"
      alertType="warning"
      alertMessage="Shopee 出货链路订单池"
      alertDescription="生成运单不会直接把订单推进到 SHIPPED；只有调用 ship_order 才会进入 PROCESSED，后续再由平台回传进入 SHIPPED。若订单仍为待补发票，需先补录发票信息。"
    />
  );
};

export default PendingShipmentOrderPage;
