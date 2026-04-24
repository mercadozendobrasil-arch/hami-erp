import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Tag } from 'antd';
import React, { useRef } from 'react';
import { queryProducts } from '@/services/erp/product';

const productStatusEnum = {
  ACTIVE: { text: '上架中', status: 'Success' as const },
  INACTIVE: { text: '已下架', status: 'Default' as const },
  UNKNOWN: { text: '未知', status: 'Default' as const },
};

const ProductListPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);

  const columns: ProColumns<ERP.ProductListItem>[] = [
    {
      title: '平台商品 ID',
      dataIndex: 'platformProductId',
      width: 200,
      copyable: true,
    },
    {
      title: '商品标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 140,
      valueEnum: productStatusEnum,
      render: (_, record) => (
        <Tag color={record.status === 'ACTIVE' ? 'green' : 'processing'}>
          {productStatusEnum[record.status as keyof typeof productStatusEnum]
            ?.text ?? record.status}
        </Tag>
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 100,
      valueType: 'digit',
      search: false,
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 140,
      search: false,
    },
  ];

  return (
    <PageContainer
      title="商品列表"
      subTitle="页面只消费 ERP 领域模型，不直接依赖 Shopee 原始字段。"
    >
      <ProTable<ERP.ProductListItem, ERP.PageParams>
        rowKey="platformProductId"
        actionRef={actionRef}
        headerTitle="Shopee 商品"
        search={{
          labelWidth: 96,
          defaultCollapsed: false,
        }}
        columns={columns}
        request={queryProducts}
        pagination={{
          pageSize: 10,
        }}
        locale={{
          emptyText: '暂无商品数据。',
        }}
        toolBarRender={() => [
          <Button key="refresh" onClick={() => actionRef.current?.reload()}>
            刷新列表
          </Button>,
        ]}
      />
    </PageContainer>
  );
};

export default ProductListPage;
