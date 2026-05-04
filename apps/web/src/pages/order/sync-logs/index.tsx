import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import { Drawer, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { useResolvedShopId } from '../hooks/useResolvedShopId';
import { queryShopeeSyncLogs } from '@/services/erp/order';

const TRIGGER_OPTIONS: Record<ERP.ShopeeSyncLogItem['triggerType'], { text: string; color: string }> = {
  manual_detail: { text: '手动详情同步', color: 'blue' },
  manual_status: { text: '手动状态同步', color: 'cyan' },
  sync_recent: { text: '最近订单补详情', color: 'gold' },
  webhook: { text: 'Webhook 回流', color: 'purple' },
  invoice_add: { text: '补发票信息', color: 'orange' },
  shipping_parameter: { text: '单单发货预检', color: 'geekblue' },
  shipping_parameter_mass: { text: 'Mass 发货预检', color: 'magenta' },
  ship: { text: '单单发货', color: 'green' },
  ship_batch: { text: 'Batch 发货', color: 'lime' },
  ship_mass: { text: 'Mass 发货', color: 'volcano' },
  tracking_sync: { text: '单单补拉运单', color: 'processing' },
  tracking_sync_mass: { text: 'Mass 补拉运单', color: 'purple' },
  shipping_update: { text: '更新发货信息', color: 'gold' },
};

const RESULT_OPTIONS: Record<ERP.ShopeeSyncLogItem['resultStatus'], { text: string; color: string }> = {
  success: { text: '成功', color: 'success' },
  partial: { text: '部分回流', color: 'warning' },
  failed: { text: '失败', color: 'error' },
};

const SyncLogsPage: React.FC = () => {
  const [drawerRow, setDrawerRow] = useState<ERP.ShopeeSyncLogItem>();
  const { shopId } = useResolvedShopId();

  const columns: ProColumns<ERP.ShopeeSyncLogItem>[] = [
    {
      title: '同步时间',
      dataIndex: 'createdAt',
      width: 180,
      search: false,
      defaultSortOrder: 'descend',
      renderText: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '触发类型',
      dataIndex: 'triggerType',
      width: 150,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(TRIGGER_OPTIONS).map(([key, value]) => [key, { text: value.text }]),
      ),
      render: (_, record) => <Tag color={TRIGGER_OPTIONS[record.triggerType].color}>{TRIGGER_OPTIONS[record.triggerType].text}</Tag>,
    },
    {
      title: '结果',
      dataIndex: 'resultStatus',
      width: 120,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(RESULT_OPTIONS).map(([key, value]) => [key, { text: value.text }]),
      ),
      render: (_, record) => <Tag color={RESULT_OPTIONS[record.resultStatus].color}>{RESULT_OPTIONS[record.resultStatus].text}</Tag>,
    },
    {
      title: '店铺 ID',
      dataIndex: 'shopId',
      width: 140,
    },
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 180,
      copyable: true,
    },
    {
      title: 'orderSn',
      dataIndex: 'orderSn',
      width: 180,
      copyable: true,
    },
    {
      title: 'packageNumber',
      dataIndex: 'packageNumber',
      width: 180,
      copyable: true,
    },
    {
      title: 'detailSource',
      dataIndex: 'detailSource',
      width: 130,
      search: false,
      renderText: (value) => value || '-',
    },
    {
      title: 'packageSource',
      dataIndex: 'packageSource',
      width: 130,
      search: false,
      renderText: (value) => value || '-',
    },
    {
      title: 'changedFields',
      dataIndex: 'changedFields',
      width: 240,
      search: false,
      render: (_, record) =>
        record.changedFields.length
          ? record.changedFields.map((item) => <Tag key={item}>{item}</Tag>)
          : '-',
    },
    {
      title: 'message',
      dataIndex: 'message',
      ellipsis: true,
      width: 320,
      search: false,
    },
    {
      title: '时间范围',
      dataIndex: 'timeRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
      search: {
        transform: (value: string[]) => ({
          startTime: value?.[0],
          endTime: value?.[1],
        }),
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      render: (_, record) => [
        <a key="detail" onClick={() => setDrawerRow(record)}>
          查看详情
        </a>,
      ],
    },
  ];

  return (
    <PageContainer
      title="同步日志"
      subTitle="用于排查 Shopee manual sync、recent sync 与 webhook 回流链路，重点支持 orderNo/orderSn/packageNumber 检索。"
    >
      <ProTable<ERP.ShopeeSyncLogItem, ERP.ShopeeSyncLogQueryParams>
        rowKey="logId"
        columns={columns}
        request={(params) =>
          shopId
            ? queryShopeeSyncLogs({ ...params, shopId })
            : Promise.resolve({ success: true, data: [], total: 0 })
        }
        search={{ labelWidth: 110 }}
        pagination={{ pageSize: 10 }}
        headerTitle="Shopee 同步日志"
      />

      <Drawer
        width={720}
        title="同步日志详情"
        open={Boolean(drawerRow)}
        onClose={() => setDrawerRow(undefined)}
        destroyOnClose
      >
        {drawerRow ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <ProDescriptions<ERP.ShopeeSyncLogItem>
              column={1}
              dataSource={drawerRow}
              columns={[
                { title: 'logId', dataIndex: 'logId' },
                {
                  title: '触发类型',
                  render: (_, record) => (
                    <Tag color={TRIGGER_OPTIONS[record.triggerType].color}>
                      {TRIGGER_OPTIONS[record.triggerType].text}
                    </Tag>
                  ),
                },
                {
                  title: '结果',
                  render: (_, record) => (
                    <Tag color={RESULT_OPTIONS[record.resultStatus].color}>
                      {RESULT_OPTIONS[record.resultStatus].text}
                    </Tag>
                  ),
                },
                { title: '时间', dataIndex: 'createdAt' },
                { title: '店铺 ID', dataIndex: 'shopId', renderText: (value) => value || '-' },
                { title: '订单号', dataIndex: 'orderNo', renderText: (value) => value || '-' },
                { title: 'orderSn', dataIndex: 'orderSn', renderText: (value) => value || '-' },
                { title: 'packageNumber', dataIndex: 'packageNumber', renderText: (value) => value || '-' },
                { title: 'detailSource', dataIndex: 'detailSource', renderText: (value) => value || '-' },
                { title: 'packageSource', dataIndex: 'packageSource', renderText: (value) => value || '-' },
                {
                  title: 'changedFields',
                  render: (_, record) =>
                    record.changedFields.length
                      ? record.changedFields.map((item) => <Tag key={item}>{item}</Tag>)
                      : '-',
                },
                { title: 'message', dataIndex: 'message', renderText: (value) => value || '-' },
              ]}
            />

            <div>
              <Typography.Title level={5}>requestPayloadSummary</Typography.Title>
              <Typography.Paragraph>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {JSON.stringify(drawerRow.requestPayloadSummary || {}, null, 2)}
                </pre>
              </Typography.Paragraph>
            </div>
          </Space>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default SyncLogsPage;
