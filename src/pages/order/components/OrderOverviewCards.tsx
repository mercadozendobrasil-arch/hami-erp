import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Skeleton, Statistic } from 'antd';
import React from 'react';
import { getOrderOverview } from '@/services/erp/order';

type OrderOverviewCardsProps = {
  currentTab?: string;
  items: Array<{
    key: keyof ERP.OrderOverview;
    title: string;
    suffix?: string;
  }>;
};

const OrderOverviewCards: React.FC<OrderOverviewCardsProps> = ({ currentTab, items }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['order-overview', currentTab],
    queryFn: () => getOrderOverview(currentTab),
  });

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {items.map((item) => (
        <Col xs={24} sm={12} lg={24 / Math.min(items.length, 4)} key={item.key}>
          <Card>
            {isLoading ? (
              <Skeleton active paragraph={false} />
            ) : (
              <Statistic
                title={item.title}
                value={data?.[item.key] ?? 0}
                suffix={item.suffix}
              />
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default OrderOverviewCards;
