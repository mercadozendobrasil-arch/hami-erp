import {
  App,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  LinkOutlined,
  ProductOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import { queryShops, syncShopeeOrdersByShop } from '@/services/erp/shop';

const shopStatusEnum = {
  AUTHORIZED: { text: '已授权', status: 'Success' as const },
  DISCONNECTED: { text: '已断开', status: 'Default' as const },
  UNKNOWN: { text: '未知', status: 'Default' as const },
};

const ShopListPage: React.FC = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType | null>(null);
  const [syncingShopId, setSyncingShopId] = useState<string>();

  const handleSyncOrders = async (record: ERP.ShopListItem) => {
    setSyncingShopId(record.shopId);
    const hide = message.loading(`正在同步 ${record.shopName || record.shopId} 的订单...`, 0);

    try {
      await syncShopeeOrdersByShop(record.shopId);
      hide();
      message.success(`已触发店铺 ${record.shopName || record.shopId} 的订单同步`);
      actionRef.current?.reload();
    } catch (error) {
      hide();
      message.error(error instanceof Error ? error.message : '订单同步触发失败');
    } finally {
      setSyncingShopId(undefined);
    }
  };

  const columns: ProColumns<ERP.ShopListItem>[] = [
    {
      title: '店铺 ID',
      dataIndex: 'shopId',
      width: 180,
      copyable: true,
    },
    {
      title: '店铺名称',
      dataIndex: 'shopName',
      ellipsis: true,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong ellipsis style={{ maxWidth: 260 }}>
            {record.shopName || '-'}
          </Typography.Text>
          <Typography.Text type="secondary" copyable>
            {record.shopId}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '站点代码',
      dataIndex: 'siteCode',
      width: 120,
      search: false,
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      width: 120,
      search: false,
      render: (_, record) => <Tag color="blue">{record.channel}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 140,
      valueEnum: shopStatusEnum,
      render: (_, record) => (
        <Tag color={record.status === 'AUTHORIZED' ? 'green' : 'default'}>
          {shopStatusEnum[record.status as keyof typeof shopStatusEnum]?.text ??
            record.status}
        </Tag>
      ),
    },
    {
      title: '商品数',
      dataIndex: 'productCount',
      width: 100,
      search: false,
      align: 'right',
      renderText: (value) => value ?? 0,
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      width: 100,
      search: false,
      align: 'right',
      renderText: (value) => value ?? 0,
    },
    {
      title: 'Token 到期',
      dataIndex: 'tokenExpireAt',
      width: 170,
      search: false,
      valueType: 'dateTime',
      renderText: (value) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '最近更新',
      dataIndex: 'updatedAt',
      width: 170,
      search: false,
      valueType: 'dateTime',
      sorter: true,
      renderText: (value) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4} wrap>
          <Button
            type="link"
            size="small"
            icon={<SyncOutlined />}
            loading={syncingShopId === record.shopId}
            disabled={record.status !== 'AUTHORIZED'}
            onClick={() => handleSyncOrders(record)}
          >
            同步订单
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ShoppingCartOutlined />}
            onClick={() => history.push(`/order/pending?shopId=${record.shopId}`)}
          >
            订单
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ProductOutlined />}
            onClick={() => history.push(`/product/list?shopId=${record.shopId}`)}
          >
            商品
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="店铺列表"
      subTitle="基于 ERP API 展示 Shopee 巴西站授权店铺。"
    >
      <ProTable<ERP.ShopListItem, ERP.PageParams>
        rowKey="shopId"
        actionRef={actionRef}
        headerTitle="Shopee 店铺"
        search={{
          labelWidth: 96,
          defaultCollapsed: false,
        }}
        columns={columns}
        request={queryShops}
        scroll={{ x: 1320 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
        }}
        locale={{
          emptyText: '暂无店铺数据，请先完成授权。',
        }}
        toolBarRender={() => [
          <Button
            key="auth"
            type="primary"
            icon={<LinkOutlined />}
            onClick={() => history.push('/shop/auth')}
          >
            新增授权
          </Button>,
          <Tooltip key="reload" title="重新加载店铺列表">
            <Button icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>
              刷新列表
            </Button>
          </Tooltip>,
          <Button
            key="products"
            icon={<ProductOutlined />}
            onClick={() => history.push('/product/list')}
          >
            查看商品
          </Button>,
          <Button
            key="orders"
            icon={<ShoppingCartOutlined />}
            onClick={() => history.push('/order/all')}
          >
            查看订单
          </Button>,
        ]}
      />
    </PageContainer>
  );
};

const ShopListPageWithApp: React.FC = () => (
  <App>
    <ShopListPage />
  </App>
);

export default ShopListPageWithApp;
