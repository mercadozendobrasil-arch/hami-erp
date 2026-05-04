import React from 'react';
import OrderStatusPage from '../components/OrderStatusPage';

const AllOrderPage: React.FC = () => {
  return (
    <OrderStatusPage
      title="全部订单"
      subTitle="按店铺查看 Shopee 已同步订单，不额外限制履约阶段。"
      headerTitle="全部订单"
      currentTab="all"
      alertType="info"
      alertMessage="当前页面展示 ERP 已同步的全部订单"
      alertDescription="如 URL 带有 shopId，会只查询该店铺；未带 shopId 时展示所有已同步店铺。"
    />
  );
};

export default AllOrderPage;
