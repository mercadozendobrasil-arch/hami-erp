import { PageContainer } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  message,
  Row,
  Select,
  Space,
  Statistic,
} from 'antd';
import React, { useMemo, useState } from 'react';
import { getOrderOverview, queryOrders } from '@/services/erp/order';
import { queryShops, syncShopeeOrdersByShop } from '@/services/erp/shop';
import OrderTable from '../components/OrderTable';

const OrderAllPage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [syncShopId, setSyncShopId] = useState<string>();
  const queryClient = useQueryClient();
  const { data: overview } = useQuery({
    queryKey: ['order-overview-home'],
    queryFn: () => getOrderOverview(),
  });
  const { data: shopsResponse } = useQuery({
    queryKey: ['order-center-shops'],
    queryFn: () => queryShops({ current: 1, pageSize: 100 }),
  });
  const shopOptions = useMemo(
    () =>
      (shopsResponse?.data || []).map((item) => ({
        label: `${item.shopName} (${item.orderCount ?? 0})`,
        value: item.shopId,
      })),
    [shopsResponse?.data],
  );
  const syncMutation = useMutation({
    mutationFn: (shopId: string) => syncShopeeOrdersByShop(shopId),
    onSuccess: (_, shopId) => {
      const targetShop = shopsResponse?.data?.find(
        (item) => item.shopId === shopId,
      );
      messageApi.success(
        `已触发 ${targetShop?.shopName || shopId} 的 Shopee 订单同步`,
      );
      queryClient.invalidateQueries({ queryKey: ['order-overview-home'] });
      queryClient.invalidateQueries({ queryKey: ['order-center-shops'] });
    },
  });

  return (
    <PageContainer
      title="订单中心"
      subTitle="按 Shopee 巴西站 OpenAPI 状态流展示订单概览和全部订单工作台。"
    >
      {contextHolder}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="订单中心已切换为 Shopee 状态链路"
        description="主链路为 UNPAID → READY_TO_SHIP → PROCESSED → SHIPPED → TO_CONFIRM_RECEIVE → COMPLETED，并包含 IN_CANCEL、CANCELLED、RETRY_SHIP、TO_RETURN 分支。"
      />
      <Card title="Shopee 订单同步" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ minWidth: 320 }}
            placeholder="选择已授权店铺后触发 Shopee 订单同步"
            options={shopOptions}
            value={syncShopId}
            onChange={setSyncShopId}
          />
          <Button
            type="primary"
            loading={syncMutation.isPending}
            disabled={!syncShopId}
            onClick={() => syncShopId && syncMutation.mutate(syncShopId)}
          >
            同步 Shopee 订单
          </Button>
          <Button onClick={() => history.push('/shop/list')}>
            去店铺列表批量同步
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="订单总数" value={overview?.total ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="未付款" value={overview?.unpaidCount ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待补发票"
              value={overview?.pendingInvoiceCount ?? 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="待出货" value={overview?.readyToShipCount ?? 0} />
          </Card>
        </Col>
      </Row>

      <OrderTable
        request={queryOrders}
        headerTitle="全部订单工作台"
        showColumnControls
        hideActions
      />
    </PageContainer>
  );
};

export default OrderAllPage;
