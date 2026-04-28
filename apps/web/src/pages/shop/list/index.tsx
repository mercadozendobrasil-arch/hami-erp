import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, message, Tag } from 'antd';
import React, { useRef } from 'react';
import { queryShops, syncShopeeOrdersByShop } from '@/services/erp/shop';

const shopStatusEnum = {
  AUTHORIZED: { text: '已授权', status: 'Success' as const },
  DISCONNECTED: { text: '已断开', status: 'Default' as const },
  UNKNOWN: { text: '未知', status: 'Default' as const },
};

const ShopListPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);

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
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      width: 100,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      render: (_, record) => [
        <a
          key="sync-orders"
          onClick={async () => {
            await syncShopeeOrdersByShop(record.shopId);
            message.success(`已触发店铺 ${record.shopName} 的 Shopee 订单同步`);
            actionRef.current?.reload();
          }}
        >
          同步订单
        </a>,
        <a
          key="view-orders"
          onClick={() => history.push(`/order/pending?shopId=${record.shopId}`)}
        >
          查看订单
        </a>,
        <a
          key="view-products"
          onClick={() => history.push(`/product/list?shopId=${record.shopId}`)}
        >
          查看商品
        </a>,
      ],
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
        pagination={{
          pageSize: 10,
        }}
        locale={{
          emptyText: '暂无店铺数据，请先完成授权。',
        }}
        toolBarRender={() => [
          <Button
            key="auth"
            type="primary"
            onClick={() => history.push('/shop/auth')}
          >
            新增授权
          </Button>,
          <Button key="reload" onClick={() => actionRef.current?.reload()}>
            刷新列表
          </Button>,
          <Button key="products" onClick={() => history.push('/product/list')}>
            查看商品
          </Button>,
          <Button key="orders" onClick={() => history.push('/order/pending')}>
            查看订单
          </Button>,
        ]}
      />
    </PageContainer>
  );
};

export default ShopListPage;
