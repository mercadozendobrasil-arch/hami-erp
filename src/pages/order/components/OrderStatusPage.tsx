import { Alert } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import React from 'react';
import { queryOrders } from '@/services/erp/order';
import OrderOverviewCards from './OrderOverviewCards';
import OrderTable from './OrderTable';

type OrderStatusPageProps = {
  title: string;
  subTitle: string;
  headerTitle: string;
  currentTab: string;
  alertType?: 'info' | 'warning' | 'success';
  alertMessage?: string;
  alertDescription?: string;
};

const OrderStatusPage: React.FC<OrderStatusPageProps> = ({
  title,
  subTitle,
  headerTitle,
  currentTab,
  alertType = 'info',
  alertMessage,
  alertDescription,
}) => {
  const overviewItemsMap: Record<string, Array<{ key: keyof ERP.OrderOverview; title: string }>> = {
    pending: [
      { key: 'pendingCount', title: '待处理总量' },
      { key: 'unpaidCount', title: '未付款' },
      { key: 'pendingInvoiceCount', title: '待补发票' },
      { key: 'readyToShipCount', title: '待出货' },
    ],
    pendingAudit: [
      { key: 'readyToShipCount', title: '待内部审核' },
      { key: 'abnormalCount', title: '异常订单' },
      { key: 'lockedCount', title: '锁定订单' },
    ],
    pendingShipment: [
      { key: 'readyToShipCount', title: '待出货' },
      { key: 'processedCount', title: '已安排出货' },
      { key: 'retryShipCount', title: '重新出货' },
      { key: 'pendingInvoiceCount', title: '待补发票' },
    ],
    shipped: [
      { key: 'shippedCount', title: '发货后订单' },
      { key: 'toConfirmReceiveCount', title: '待确认收货' },
      { key: 'completedCount', title: '已完成' },
    ],
    cancelRefund: [
      { key: 'inCancelCount', title: '取消中' },
      { key: 'cancelledCount', title: '已取消' },
      { key: 'toReturnCount', title: '退货退款中' },
    ],
  };

  return (
    <PageContainer title={title} subTitle={subTitle}>
      {overviewItemsMap[currentTab]?.length ? (
        <OrderOverviewCards currentTab={currentTab} items={overviewItemsMap[currentTab]} />
      ) : null}
      {alertMessage ? (
        <Alert
          type={alertType}
          showIcon
          style={{ marginBottom: 16 }}
          message={alertMessage}
          description={alertDescription}
        />
      ) : null}
      <OrderTable request={queryOrders} headerTitle={headerTitle} currentTab={currentTab} />
    </PageContainer>
  );
};

export default OrderStatusPage;
