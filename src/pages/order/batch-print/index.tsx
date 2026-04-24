import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Space, Tag, message } from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import OrderOverviewCards from '../components/OrderOverviewCards';
import { queryOrders } from '@/services/erp/order';

const BatchPrintPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [selectedRows, setSelectedRows] = useState<ERP.OrderListItem[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  const columns: ProColumns<ERP.OrderListItem>[] = [
    { title: '订单号', dataIndex: 'orderNo', copyable: true, width: 180 },
    { title: '店铺', dataIndex: 'shopName', width: 160 },
    { title: '买家', dataIndex: 'buyerName', width: 140 },
    { title: '商品摘要', dataIndex: 'items', ellipsis: true },
    { title: '仓库', dataIndex: 'warehouseName', width: 140 },
    {
      title: '打印状态',
      dataIndex: 'printStatus',
      search: false,
      width: 120,
      render: (_, record) => (
        <Tag color={record.trackingNo !== '-' ? 'default' : 'processing'}>
          {record.trackingNo !== '-' ? '已生成面单' : '待生成面单'}
        </Tag>
      ),
    },
    {
      title: '下单时间',
      dataIndex: 'orderTime',
      width: 180,
      search: false,
      renderText: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <PageContainer title="批量打印" subTitle="按 Shopee 包裹准备状态处理面单与拣货单打印。">
      {contextHolder}
      <OrderOverviewCards
        currentTab="pendingShipment"
        items={[
          { key: 'total', title: '待打印订单' },
          { key: 'printPendingCount', title: '未打印' },
          { key: 'warehousePendingCount', title: '待分仓' },
          { key: 'lockedCount', title: '锁定订单' },
        ]}
      />
      <ProTable<ERP.OrderListItem, ERP.OrderQueryParams>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        request={(params) => queryOrders({ ...params, currentTab: 'pendingShipment' })}
        search={{ labelWidth: 92 }}
        rowSelection={{ onChange: (_, rows) => setSelectedRows(rows) }}
        pagination={{ pageSize: 10 }}
        toolBarRender={() => [
          <Space key="actions">
            <Button
              type="primary"
              disabled={!selectedRows.length}
              onClick={() => messageApi.success(`已提交 ${selectedRows.length} 条订单面单打印任务`)}
            >
              打印面单
            </Button>
            <Button
              disabled={!selectedRows.length}
              onClick={() => messageApi.success(`已提交 ${selectedRows.length} 条订单拣货单打印任务`)}
            >
              打印拣货单
            </Button>
          </Space>,
        ]}
      />
    </PageContainer>
  );
};

export default BatchPrintPage;
