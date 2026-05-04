import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import dayjs from 'dayjs';
import React from 'react';
import { useResolvedShopId } from '../hooks/useResolvedShopId';
import { queryOrderLogs } from '@/services/erp/order';

const LogAuditPage: React.FC = () => {
  const { shopId } = useResolvedShopId();
  const columns: ProColumns<ERP.OrderLogItem>[] = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 180,
      copyable: true,
    },
    {
      title: '模块',
      dataIndex: 'module',
      width: 140,
      valueType: 'select',
      valueEnum: {
        ORDER_SYNC: { text: '订单同步' },
        ORDER_AUDIT: { text: '订单审核' },
        ORDER_CENTER: { text: '订单中心' },
      },
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      width: 140,
    },
    {
      title: '动作',
      dataIndex: 'action',
      width: 160,
    },
    {
      title: '详情',
      dataIndex: 'detail',
      ellipsis: true,
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      width: 180,
      search: false,
      renderText: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <PageContainer title="操作日志" subTitle="用于审计订单处理链路中的关键动作和系统操作记录。">
      <ProTable<ERP.OrderLogItem, ERP.OrderLogQueryParams>
        rowKey="id"
        columns={columns}
        request={(params) =>
          queryOrderLogs({ ...params, ...(shopId ? { shopId } : {}) })
        }
        search={{ labelWidth: 92 }}
        pagination={{ pageSize: 10 }}
        headerTitle="日志审计"
      />
    </PageContainer>
  );
};

export default LogAuditPage;
