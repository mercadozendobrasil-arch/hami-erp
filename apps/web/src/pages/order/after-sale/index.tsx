import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import { Alert, Drawer, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { useResolvedShopId } from '../hooks/useResolvedShopId';
import { getActionBinding } from '@/services/erp/orderPlatform';
import { queryAfterSales } from '@/services/erp/order';
import {
  AFTER_SALE_STATUS_OPTIONS,
  SHOPEE_PLATFORM_STATUS_OPTIONS,
  renderStatusTag,
} from '../constants';

const AfterSalePage: React.FC = () => {
  const [drawerRow, setDrawerRow] = useState<ERP.AfterSaleItem>();
  const { shopId } = useResolvedShopId();
  const columns: ProColumns<ERP.AfterSaleItem>[] = [
    {
      title: '售后单号',
      dataIndex: 'afterSaleNo',
      width: 180,
      copyable: true,
    },
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 180,
      copyable: true,
    },
    {
      title: '平台状态',
      dataIndex: 'platformStatus',
      width: 140,
      search: false,
      render: (_, record) => renderStatusTag(record.platformStatus, SHOPEE_PLATFORM_STATUS_OPTIONS),
    },
    {
      title: '店铺',
      dataIndex: 'shopName',
      width: 160,
    },
    {
      title: '买家',
      dataIndex: 'buyerName',
      width: 140,
    },
    {
      title: '售后类型',
      dataIndex: 'type',
      width: 120,
      search: false,
      render: (_, record) => <Tag color="blue">{record.type}</Tag>,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      valueEnum: Object.fromEntries(
        Object.entries(AFTER_SALE_STATUS_OPTIONS).map(([key, value]) => [
          key,
          { text: value.text },
        ]),
      ),
      render: (_, record) => renderStatusTag(record.status, AFTER_SALE_STATUS_OPTIONS),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      search: false,
      renderText: (value) => `BRL ${value}`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      valueType: 'dateTime',
      search: false,
      renderText: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      valueType: 'dateTime',
      search: false,
      renderText: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '平台售后处理',
      dataIndex: 'processingProfile',
      search: false,
      width: 220,
      render: (_, record) => {
        const listBinding = getActionBinding(record.processingProfile, 'returnList');
        const detailBinding = getActionBinding(record.processingProfile, 'returnDetail');
        const detailText = detailBinding?.available
          ? `${detailBinding.manager}.${detailBinding.method}`
          : detailBinding?.reason || '当前不可处理';

        return (
          <>
            <Tag color={listBinding?.available ? 'blue' : 'default'}>
              {listBinding?.method || 'getReturnList'}
            </Tag>
            <Tooltip title={detailText}>
              <a onClick={() => setDrawerRow(record)}>查看 Shopee 处理配置</a>
            </Tooltip>
          </>
        );
      },
    },
  ];

  return (
    <PageContainer title="售后管理" subTitle="统一处理退款、退货退款和售后流程跟踪。">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Shopee 售后能力已接入配置展示"
        description="售后页现在会显示当前售后单在 Shopee returns manager 下的读取能力与限制原因，便于区分 ERP 内部处理和平台侧处理。"
      />
      <ProTable<ERP.AfterSaleItem, ERP.OrderQueryParams>
        rowKey="id"
        columns={columns}
        request={(params) => queryAfterSales({ ...params, ...(shopId ? { shopId } : {}) })}
        search={{ labelWidth: 92, defaultCollapsed: false }}
        pagination={{ pageSize: 10 }}
        headerTitle="售后订单"
      />
      <Drawer
        width={640}
        title="Shopee 售后处理配置"
        open={Boolean(drawerRow)}
        onClose={() => setDrawerRow(undefined)}
        destroyOnClose
      >
        {drawerRow ? (
          <>
            <ProDescriptions<ERP.AfterSaleItem>
              column={1}
              dataSource={drawerRow}
              columns={[
                { title: '售后单号', dataIndex: 'afterSaleNo' },
                { title: '来源订单', dataIndex: 'orderNo' },
                { title: '平台状态', render: (_, record) => renderStatusTag(record.platformStatus, SHOPEE_PLATFORM_STATUS_OPTIONS) },
                { title: 'Shopee 站点', dataIndex: ['processingProfile', 'region'] },
                { title: '售后接口集合', dataIndex: ['processingProfile', 'returnsEndpoint'] },
                { title: 'Returns Manager', dataIndex: ['processingProfile', 'returnsManager'] },
              ]}
            />
            <ProTable<ERP.OrderActionBinding>
              rowKey="actionKey"
              search={false}
              options={false}
              pagination={false}
              style={{ marginTop: 16 }}
              columns={[
                { title: '动作', dataIndex: 'label', width: 160 },
                { title: '方法', dataIndex: 'method', width: 180 },
                { title: '接口', dataIndex: 'endpoint' },
                {
                  title: '可执行',
                  dataIndex: 'available',
                  width: 100,
                  render: (_, record) => (
                    <Tag color={record.available ? 'success' : 'default'}>
                      {record.available ? '可执行' : '受限'}
                    </Tag>
                  ),
                },
                {
                  title: '原因',
                  dataIndex: 'reason',
                  renderText: (value) => value || '-',
                },
              ]}
              request={async () => ({
                data: drawerRow.processingProfile.actionBindings.filter((item) =>
                  ['returnList', 'returnDetail'].includes(item.actionKey),
                ),
                success: true,
              })}
            />
          </>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default AfterSalePage;
