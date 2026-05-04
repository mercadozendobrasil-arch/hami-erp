import { useQuery } from '@tanstack/react-query';
import { ProCard } from '@ant-design/pro-components';
import { Alert, Button, Col, Row, Skeleton, Statistic } from 'antd';
import React from 'react';
import { getOrderOverview } from '@/services/erp/order';
import { queryLiveOrderStatusCounts } from '@/services/erp/orderLive';

type OrderOverviewCardsProps = {
  currentTab?: string;
  shopId?: string;
  live?: boolean;
  items: Array<{
    key: keyof ERP.OrderOverview;
    title: string;
    suffix?: string;
  }>;
};

function normalizeLiveOverview(
  counts?: Awaited<ReturnType<typeof queryLiveOrderStatusCounts>>['data'],
): Partial<ERP.OrderOverview> {
  return {
    total: counts?.total ?? 0,
    pendingCount:
      (counts?.pendingInvoice ?? 0) +
      (counts?.pendingShipment ?? 0) +
      (counts?.pendingPrint ?? 0) +
      (counts?.pendingPickup ?? 0),
    pendingInvoiceCount: counts?.pendingInvoice ?? 0,
    readyToShipCount: counts?.pendingShipment ?? 0,
    printPendingCount: counts?.pendingPrint ?? 0,
    logisticsPendingCount: counts?.pendingPickup ?? 0,
    processedCount: counts?.pendingPickup ?? 0,
    shippedCount: counts?.shipped ?? 0,
  };
}

const OrderOverviewCards: React.FC<OrderOverviewCardsProps> = ({
  currentTab,
  shopId,
  live = false,
  items,
}) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['order-overview', currentTab, shopId, live],
    queryFn: async () => {
      if (!live) {
        return getOrderOverview(currentTab);
      }
      const response = await queryLiveOrderStatusCounts({ shopId });
      return normalizeLiveOverview(response.data);
    },
  });

  return (
    <>
      {isError ? (
        <Alert
          showIcon
          type="warning"
          style={{ marginBottom: 16 }}
          message="订单概览加载失败"
          description="列表仍可继续使用，可稍后刷新概览数据。"
          action={
            <Button size="small" onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      ) : null}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {items.map((item) => (
          <Col xs={24} sm={12} lg={24 / Math.min(items.length, 4)} key={item.key}>
            <ProCard>
              {isLoading ? (
                <Skeleton active paragraph={false} />
              ) : (
                <Statistic
                  title={item.title}
                  value={data?.[item.key] ?? 0}
                  suffix={item.suffix}
                />
              )}
            </ProCard>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default OrderOverviewCards;
