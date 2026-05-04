import { Alert } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import { useLocation } from '@umijs/max';
import React, { useMemo } from 'react';
import { queryOrders } from '@/services/erp/order';
import {
  queryLiveOrders,
  LiveFulfillmentStage,
} from '@/services/erp/orderLive';
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
  shopId?: string;
  live?: boolean;
};

const TAB_TO_FULFILLMENT_STAGE: Record<string, LiveFulfillmentStage | undefined> = {
  pendingInvoice: 'pending_invoice',
  pendingShipment: 'pending_shipment',
  pendingPrint: 'pending_print',
  pendingPickup: 'pending_pickup',
  shipped: 'shipped',
};

const OrderStatusPage: React.FC<OrderStatusPageProps> = ({
  title,
  subTitle,
  headerTitle,
  currentTab,
  alertType = 'info',
  alertMessage,
  alertDescription,
  shopId,
  live = true,
}) => {
  const location = useLocation();
  const queryShopId = useMemo(
    () => new URLSearchParams(location.search).get('shopId') || undefined,
    [location.search],
  );
  const effectiveShopId = shopId || queryShopId;
  const overviewItemsMap: Record<string, Array<{ key: keyof ERP.OrderOverview; title: string }>> = {
    pending: [
      { key: 'pendingCount', title: '待处理总量' },
      { key: 'unpaidCount', title: '未付款' },
      { key: 'pendingInvoiceCount', title: '待补发票' },
      { key: 'readyToShipCount', title: '待出货' },
    ],
    pendingInvoice: [
      { key: 'pendingInvoiceCount', title: '待开票' },
      { key: 'readyToShipCount', title: '可出货' },
      { key: 'printPendingCount', title: '待面单' },
    ],
    pendingPrint: [
      { key: 'printPendingCount', title: '待打印面单' },
      { key: 'readyToShipCount', title: '待出货' },
      { key: 'logisticsPendingCount', title: '待揽收' },
    ],
    pendingPickup: [
      { key: 'logisticsPendingCount', title: '待揽收' },
      { key: 'processedCount', title: '已安排出货' },
      { key: 'shippedCount', title: '已发货' },
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

  const fulfillmentStage = TAB_TO_FULFILLMENT_STAGE[currentTab];
  const request = live
    ? (params: ERP.OrderQueryParams) =>
        queryLiveOrders({ ...params, shopId: effectiveShopId, fulfillmentStage })
    : queryOrders;

  return (
    <PageContainer title={title} subTitle={subTitle}>
      {overviewItemsMap[currentTab]?.length ? (
        <OrderOverviewCards
          currentTab={currentTab}
          shopId={effectiveShopId}
          live={live}
          items={overviewItemsMap[currentTab]}
        />
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
      <OrderTable request={request} headerTitle={headerTitle} currentTab={currentTab} />
    </PageContainer>
  );
};

export default OrderStatusPage;
