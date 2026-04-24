import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { FooterToolbar, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Checkbox, message, Space, Typography } from 'antd';
import type { SortOrder } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AFTER_SALE_STATUS_OPTIONS,
  AFTER_SALE_STATUS_VALUE_ENUM,
  AUDIT_STATUS_OPTIONS,
  LOGISTICS_COMPANY_OPTIONS,
  LOGISTICS_STATUS_OPTIONS,
  LOGISTICS_STATUS_VALUE_ENUM,
  ORDER_STATUS_VALUE_ENUM,
  PACKAGE_FULFILLMENT_STATUS_OPTIONS,
  PACKAGE_FULFILLMENT_STATUS_VALUE_ENUM,
  PACKAGE_STATUS_OPTIONS,
  PACKAGE_STATUS_VALUE_ENUM,
  PAY_STATUS_OPTIONS,
  PAY_STATUS_VALUE_ENUM,
  renderExceptionTags,
  renderStatusTag,
  SHOPEE_PLATFORM_STATUS_OPTIONS,
  WAREHOUSE_OPTIONS,
} from '../constants';
import { getOrderActionPolicies } from '../utils/actionPolicy';
import { formatBrazilCurrency } from '../utils/br';
import OrderActionModals from './OrderActionModals';

type OrderTableProps = {
  request: (
    params: ERP.OrderQueryParams,
  ) => Promise<API.ListResponse<ERP.OrderListItem>>;
  headerTitle: string;
  currentTab?: string;
  showColumnControls?: boolean;
  hideActions?: boolean;
};

type ColumnStateMap = Record<
  string,
  { show?: boolean; fixed?: 'left' | 'right' }
>;

function normalizeSorter(sort: Record<string, SortOrder>) {
  return Object.fromEntries(
    Object.entries(sort).filter(
      ([, value]) => value === 'ascend' || value === 'descend',
    ),
  ) as ERP.OrderQueryParams['sorter'];
}

function buildDefaultColumnState(columns: ProColumns<ERP.OrderListItem>[]) {
  return columns.reduce<ColumnStateMap>((acc, column) => {
    const key = String(column.key || column.dataIndex);
    if (!key || key === 'undefined') {
      return acc;
    }
    acc[key] = {
      show: !column.hideInTable,
      fixed: column.fixed,
    };
    return acc;
  }, {});
}

const OrderTable: React.FC<OrderTableProps> = ({
  request,
  headerTitle,
  currentTab,
  showColumnControls = false,
  hideActions = false,
}) => {
  const actionRef = useRef<ActionType | null>(null);
  const [selectedRows, setSelectedRows] = useState<ERP.OrderListItem[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  const columns = useMemo<ProColumns<ERP.OrderListItem>[]>(
    () =>
      [
        {
          title: '订单号',
          dataIndex: 'orderNo',
          width: 180,
          copyable: true,
          fixed: 'left',
          render: (_, record) => (
            <a onClick={() => history.push(`/order/detail/${record.id}`)}>
              {record.orderNo}
            </a>
          ),
        },
        {
          title: '平台单号',
          dataIndex: 'platformOrderNo',
          width: 180,
          copyable: true,
        },
        {
          title: 'Shopee 状态',
          dataIndex: 'orderStatus',
          width: 150,
          valueEnum: ORDER_STATUS_VALUE_ENUM,
          render: (_, record) =>
            renderStatusTag(record.orderStatus, SHOPEE_PLATFORM_STATUS_OPTIONS),
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
          title: '商品摘要',
          dataIndex: 'items',
          width: 220,
          search: false,
          ellipsis: true,
        },
        {
          title: 'SKU数',
          dataIndex: 'skuCount',
          width: 90,
          search: false,
        },
        {
          title: '订单金额',
          dataIndex: 'totalAmount',
          width: 120,
          sorter: true,
          search: false,
          renderText: (value, record) =>
            formatBrazilCurrency(value, record.currency),
        },
        {
          title: '付款状态',
          dataIndex: 'payStatus',
          width: 120,
          valueEnum: PAY_STATUS_VALUE_ENUM,
          render: (_, record) =>
            renderStatusTag(record.payStatus, PAY_STATUS_OPTIONS),
        },
        {
          title: '审核状态',
          dataIndex: 'auditStatus',
          width: 120,
          render: (_, record) =>
            renderStatusTag(record.auditStatus, AUDIT_STATUS_OPTIONS),
        },
        {
          title: '包裹状态',
          dataIndex: 'packageStatus',
          width: 140,
          valueEnum: PACKAGE_STATUS_VALUE_ENUM,
          render: (_, record) =>
            renderStatusTag(record.packageStatus, PACKAGE_STATUS_OPTIONS),
        },
        {
          title: '包裹履约状态',
          dataIndex: 'packageFulfillmentStatus',
          width: 160,
          valueEnum: PACKAGE_FULFILLMENT_STATUS_VALUE_ENUM,
          render: (_, record) =>
            renderStatusTag(
              record.packageFulfillmentStatus,
              PACKAGE_FULFILLMENT_STATUS_OPTIONS,
            ),
        },
        {
          title: '物流状态',
          dataIndex: 'logisticsStatus',
          width: 160,
          valueEnum: LOGISTICS_STATUS_VALUE_ENUM,
          render: (_, record) =>
            renderStatusTag(record.logisticsStatus, LOGISTICS_STATUS_OPTIONS),
        },
        {
          title: '售后状态',
          dataIndex: 'afterSaleStatus',
          width: 120,
          search: false,
          valueEnum: AFTER_SALE_STATUS_VALUE_ENUM,
          render: (_, record) =>
            renderStatusTag(record.afterSaleStatus, AFTER_SALE_STATUS_OPTIONS),
        },
        {
          title: '仓库',
          dataIndex: 'warehouseName',
          width: 140,
          valueType: 'select',
          fieldProps: {
            options: WAREHOUSE_OPTIONS.map((item) => ({
              label: item,
              value: item,
            })),
          },
        },
        {
          title: '物流商',
          dataIndex: 'logisticsCompany',
          width: 140,
          valueType: 'select',
          fieldProps: {
            options: LOGISTICS_COMPANY_OPTIONS.map((item) => ({
              label: item,
              value: item,
            })),
          },
          renderText: (_, record) =>
            record.shippingCarrier || record.logisticsCompany,
        },
        {
          title: '支付方式',
          dataIndex: 'paymentMethod',
          width: 140,
        },
        {
          title: '运单号',
          dataIndex: 'trackingNo',
          width: 160,
          search: false,
        },
        {
          title: '包裹号',
          dataIndex: 'packageNumber',
          width: 180,
          search: false,
          copyable: true,
        },
        {
          title: '包裹数',
          dataIndex: 'packageCount',
          width: 90,
          search: false,
        },
        {
          title: '最晚出货时间',
          dataIndex: 'shipByDate',
          width: 180,
          search: false,
          renderText: (value) =>
            value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
          title: '最近同步',
          dataIndex: 'lastSyncTime',
          width: 180,
          search: false,
          renderText: (value) =>
            value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
          title: '标签',
          dataIndex: 'tags',
          width: 220,
          search: false,
          render: (_, record) => renderExceptionTags(record.tags),
        },
        {
          title: '取消发起方',
          dataIndex: 'cancelBy',
          hideInTable: true,
          valueType: 'select',
          fieldProps: {
            options: [
              { label: '买家', value: 'buyer' },
              { label: '卖家', value: 'seller' },
              { label: '系统', value: 'system' },
              { label: '运营', value: 'ops' },
            ],
          },
        },
        {
          title: '下单时间',
          dataIndex: 'orderTime',
          width: 180,
          sorter: true,
          valueType: 'dateTimeRange',
          renderText: (value) =>
            value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
          title: '备注',
          dataIndex: 'remark',
          width: 180,
          search: false,
          ellipsis: true,
        },
        {
          title: '操作',
          dataIndex: 'actions',
          valueType: 'option',
          width: 320,
          fixed: 'right',
          hideInTable: hideActions,
          hideInSearch: true,
          hideInSetting: hideActions,
          render: (_, record) => (
            <Space size={4} wrap>
              <Button
                type="link"
                size="small"
                onClick={() => history.push(`/order/detail/${record.id}`)}
              >
                详情
              </Button>
              <OrderActionModals
                currentOrder={record}
                allowedActions={getOrderActionPolicies({
                  currentTab,
                  orders: [record],
                })}
                onSuccess={() => actionRef.current?.reload()}
              />
            </Space>
          ),
        },
      ].filter((column) => !(hideActions && column.dataIndex === 'actions')),
    [currentTab, hideActions],
  );
  const defaultColumnState = useMemo(
    () => buildDefaultColumnState(columns),
    [columns],
  );
  const [columnsStateMap, setColumnsStateMap] =
    useState<ColumnStateMap>(defaultColumnState);

  useEffect(() => {
    setColumnsStateMap(defaultColumnState);
  }, [defaultColumnState]);

  const columnVisibilityOptions = useMemo(
    () =>
      columns
        .filter((column) => column.hideInSetting !== true)
        .map((column) => ({
          label:
            typeof column.title === 'string'
              ? column.title
              : String(column.dataIndex),
          value: String(column.key || column.dataIndex),
        }))
        .filter((item) => item.value && item.value !== 'undefined'),
    [columns],
  );
  const visibleColumnKeys = useMemo(
    () =>
      columnVisibilityOptions
        .map((item) => item.value)
        .filter((key) => columnsStateMap[key]?.show !== false),
    [columnVisibilityOptions, columnsStateMap],
  );

  const handleColumnVisibilityChange = (
    nextVisibleKeys: Array<string | number>,
  ) => {
    const visibleKeySet = new Set(nextVisibleKeys.map(String));
    setColumnsStateMap((prev) =>
      columnVisibilityOptions.reduce<ColumnStateMap>(
        (acc, item) => {
          acc[item.value] = {
            ...prev[item.value],
            fixed:
              defaultColumnState[item.value]?.fixed || prev[item.value]?.fixed,
            show: visibleKeySet.has(item.value),
          };
          return acc;
        },
        { ...prev },
      ),
    );
  };

  return (
    <>
      {contextHolder}
      {showColumnControls && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: '#fff',
            borderRadius: 8,
          }}
        >
          <Space size={[12, 12]} wrap>
            <Typography.Text strong>列显示</Typography.Text>
            <Button
              size="small"
              onClick={() =>
                handleColumnVisibilityChange(
                  columnVisibilityOptions.map((item) => item.value),
                )
              }
            >
              全选
            </Button>
            <Button
              size="small"
              onClick={() => setColumnsStateMap(defaultColumnState)}
            >
              恢复默认
            </Button>
            <Checkbox.Group
              options={columnVisibilityOptions}
              value={visibleColumnKeys}
              onChange={handleColumnVisibilityChange}
            />
          </Space>
        </div>
      )}
      <ProTable<ERP.OrderListItem, ERP.OrderQueryParams>
        rowKey="id"
        actionRef={actionRef}
        headerTitle={headerTitle}
        columns={columns}
        columnsState={{
          value: columnsStateMap,
          onChange: setColumnsStateMap,
        }}
        options={showColumnControls ? { setting: false } : undefined}
        scroll={{ x: 2800 }}
        expandable={{
          expandedRowRender: (record) => (
            <Space direction="vertical" size={8}>
              {record.packageList.map((pkg) => (
                <Space key={pkg.packageNumber} wrap>
                  <Typography.Text strong>{pkg.packageNumber}</Typography.Text>
                  {renderStatusTag(pkg.packageStatus, PACKAGE_STATUS_OPTIONS)}
                  {renderStatusTag(
                    pkg.packageFulfillmentStatus,
                    PACKAGE_FULFILLMENT_STATUS_OPTIONS,
                  )}
                  {renderStatusTag(
                    pkg.logisticsStatus,
                    LOGISTICS_STATUS_OPTIONS,
                  )}
                  <Typography.Text type="secondary">
                    运单：{pkg.trackingNumber || '-'}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    承运商：{pkg.shippingCarrier || '-'}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    渠道：
                    {pkg.logisticsChannelName ||
                      `ID ${pkg.logisticsChannelId || '-'}`}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    面单：{pkg.shippingDocumentStatus || '-'}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    商品数：{pkg.parcelItemCount}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    包裹更新时间：
                    {pkg.latestPackageUpdateTime
                      ? dayjs(pkg.latestPackageUpdateTime).format(
                          'YYYY-MM-DD HH:mm:ss',
                        )
                      : '-'}
                  </Typography.Text>
                </Space>
              ))}
            </Space>
          ),
          rowExpandable: (record) => record.packageList.length > 0,
        }}
        search={{
          labelWidth: 92,
          defaultCollapsed: false,
        }}
        request={async (params, sort) => {
          const timeRange = params.orderTime as string[] | undefined;
          const response = await request({
            ...params,
            currentTab,
            startTime: timeRange?.[0],
            endTime: timeRange?.[1],
            sorter: normalizeSorter(sort),
          });

          return response;
        }}
        rowSelection={{
          onChange: (_, rows) => setSelectedRows(rows),
        }}
        pagination={{ pageSize: 10 }}
        toolBarRender={
          hideActions
            ? false
            : () => [
                <OrderActionModals
                  key="batch-actions"
                  selectedOrders={selectedRows}
                  allowedActions={getOrderActionPolicies({
                    currentTab,
                    orders: selectedRows,
                    isBatch: true,
                  })}
                  onSuccess={() => actionRef.current?.reloadAndRest?.()}
                />,
                <Button
                  key="export"
                  onClick={() =>
                    messageApi.success(
                      `已提交${selectedRows.length ? `${selectedRows.length}条订单` : '当前筛选结果'}导出任务`,
                    )
                  }
                >
                  批量导出
                </Button>,
                <Button
                  key="print"
                  onClick={() =>
                    messageApi.success(
                      `已提交${selectedRows.length ? `${selectedRows.length}条订单` : '当前筛选结果'}打印任务`,
                    )
                  }
                >
                  批量打印
                </Button>,
              ]
        }
      />

      {!hideActions && selectedRows.length > 0 && (
        <FooterToolbar
          extra={
            <Typography.Text>
              已选{' '}
              <Typography.Text strong>{selectedRows.length}</Typography.Text>{' '}
              条订单
            </Typography.Text>
          }
        >
          <OrderActionModals
            selectedOrders={selectedRows}
            allowedActions={getOrderActionPolicies({
              currentTab,
              orders: selectedRows,
              isBatch: true,
            })}
            onSuccess={() => actionRef.current?.reloadAndRest?.()}
          />
        </FooterToolbar>
      )}
    </>
  );
};

export default OrderTable;
