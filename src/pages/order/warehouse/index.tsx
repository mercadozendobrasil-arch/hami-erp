import {
  ModalForm,
  ProDescriptions,
  ProFormSelect,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Modal, Progress, Space, message } from 'antd';
import React, { useRef, useState } from 'react';
import OrderOverviewCards from '../components/OrderOverviewCards';
import {
  ORDER_STATUS_OPTIONS,
  WAREHOUSE_OPTIONS,
  WAREHOUSE_STATUS_OPTIONS,
  WAREHOUSE_STATUS_VALUE_ENUM,
  renderStatusTag,
} from '../constants';
import {
  assignWarehouse,
  lockWarehouseOrders,
  queryWarehouseOrders,
  reassignWarehouse,
  unlockWarehouseOrders,
} from '@/services/erp/order';

const WarehouseAllocationPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [selectedRows, setSelectedRows] = useState<ERP.OrderListItem[]>([]);
  const [currentRow, setCurrentRow] = useState<ERP.OrderListItem>();
  const [drawerRow, setDrawerRow] = useState<ERP.OrderListItem>();
  const [reassignMode, setReassignMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = () => actionRef.current?.reloadAndRest?.();

  const columns: ProColumns<ERP.OrderListItem>[] = [
    { title: '订单号', dataIndex: 'orderNo', copyable: true, width: 180 },
    { title: '店铺', dataIndex: 'shopName', width: 160 },
    {
      title: 'Shopee 状态',
      dataIndex: 'orderStatus',
      width: 140,
      search: false,
      render: (_, record) => renderStatusTag(record.orderStatus, ORDER_STATUS_OPTIONS),
    },
    { title: '商品摘要', dataIndex: 'items', ellipsis: true },
    { title: 'SKU数', dataIndex: 'skuCount', width: 90, search: false },
    {
      title: '分仓状态',
      dataIndex: 'warehouseStatus',
      width: 120,
      valueEnum: WAREHOUSE_STATUS_VALUE_ENUM,
      render: (_, record) => renderStatusTag(record.warehouseStatus, WAREHOUSE_STATUS_OPTIONS),
    },
    { title: '当前仓库', dataIndex: 'warehouseName', width: 140 },
    { title: '推荐仓库', dataIndex: 'recommendedWarehouse', width: 140 },
    {
      title: '分仓策略',
      dataIndex: 'allocationStrategy',
      width: 120,
      search: false,
    },
    {
      title: '分仓依据',
      dataIndex: 'allocationReason',
      ellipsis: true,
      search: false,
    },
    {
      title: '库存预警',
      dataIndex: 'stockWarning',
      width: 150,
      search: false,
    },
    {
      title: '匹配度',
      dataIndex: 'score',
      search: false,
      render: (_, record) => (
        <Progress
          percent={record.stockSufficient ? 86 : 42}
          size="small"
          status={record.stockSufficient ? 'success' : 'exception'}
        />
      ),
    },
    {
      title: '分配时间',
      dataIndex: 'warehouseAssignedAt',
      width: 180,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      render: (_, record) => [
        <a
          key="assign"
          onClick={() => {
            setCurrentRow(record);
            setReassignMode(false);
            setModalOpen(true);
          }}
        >
          分配仓库
        </a>,
        <a
          key="reassign"
          onClick={() => {
            setCurrentRow(record);
            setReassignMode(true);
            setModalOpen(true);
          }}
        >
          重新分仓
        </a>,
        <a key="reason" onClick={() => setDrawerRow(record)}>
          查看分仓依据
        </a>,
        <a
          key="warning"
          onClick={() =>
            Modal.info({
              title: '库存预警',
              content: record.stockWarning,
            })
          }
        >
          查看库存预警
        </a>,
      ],
    },
  ];

  return (
    <PageContainer title="仓库分配" subTitle="内部仓配能力继续保留，但以 Shopee 主状态作为上下文，不再替代 Shopee 订单状态。">
      <OrderOverviewCards
        currentTab="pendingShipment"
        items={[
          { key: 'total', title: '待仓配订单' },
          { key: 'readyToShipCount', title: '待出货' },
          { key: 'processedCount', title: '已安排出货' },
          { key: 'retryShipCount', title: '重新出货' },
          { key: 'lockedCount', title: '锁定订单' },
        ]}
      />
      <ProTable<ERP.OrderListItem, ERP.OrderQueryParams>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        request={(params) => queryWarehouseOrders({ ...params, currentTab: 'pendingShipment' })}
        search={{ labelWidth: 92 }}
        pagination={{ pageSize: 10 }}
        rowSelection={{ onChange: (_, rows) => setSelectedRows(rows) }}
        headerTitle="待分仓订单"
        toolBarRender={() => [
          <Button
            key="assign"
            type="primary"
            disabled={!selectedRows.length}
            onClick={() => {
              setCurrentRow(undefined);
              setReassignMode(false);
              setModalOpen(true);
            }}
          >
            批量分配仓库
          </Button>,
          <Button
            key="reassign"
            disabled={!selectedRows.length}
            onClick={() => {
              setCurrentRow(undefined);
              setReassignMode(true);
              setModalOpen(true);
            }}
          >
            批量重新分仓
          </Button>,
          <Button
            key="lock"
            disabled={!selectedRows.length}
            onClick={() =>
              Modal.confirm({
                title: '批量锁定仓库',
                content: `确认锁定 ${selectedRows.length} 条订单的仓配吗？`,
                onOk: async () => {
                  await lockWarehouseOrders({ orderIds: selectedRows.map((item) => item.id) });
                  message.success('已批量锁定仓库');
                  reload();
                },
              })
            }
          >
            批量锁定仓库
          </Button>,
          <Button
            key="unlock"
            disabled={!selectedRows.length}
            onClick={() =>
              Modal.confirm({
                title: '批量解除仓库锁定',
                content: `确认解除 ${selectedRows.length} 条订单的仓配锁定吗？`,
                onOk: async () => {
                  await unlockWarehouseOrders({ orderIds: selectedRows.map((item) => item.id) });
                  message.success('已解除仓库锁定');
                  reload();
                },
              })
            }
          >
            批量解除仓库锁定
          </Button>,
          <Button
            key="export"
            onClick={() => message.success(`已提交 ${selectedRows.length || 0} 条仓配订单导出任务`)}
          >
            批量导出
          </Button>,
        ]}
      />

      <ModalForm
        title={reassignMode ? (currentRow ? '重新分仓' : '批量重新分仓') : currentRow ? '分配仓库' : '批量分配仓库'}
        open={modalOpen}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => {
            setModalOpen(false);
            setCurrentRow(undefined);
            setReassignMode(false);
          },
        }}
        initialValues={{
          warehouseName: currentRow?.recommendedWarehouse || currentRow?.warehouseName,
        }}
        onFinish={async (values) => {
          const orderIds = currentRow ? [currentRow.id] : selectedRows.map((item) => item.id);
          if (reassignMode) {
            await reassignWarehouse({ orderIds, warehouseName: values.warehouseName });
            message.success(currentRow ? '订单已重新分仓' : '已批量重新分仓');
          } else {
            await assignWarehouse({ orderIds, warehouseName: values.warehouseName });
            message.success(currentRow ? '订单已分配仓库' : '已批量分配仓库');
          }
          setModalOpen(false);
          setCurrentRow(undefined);
          setReassignMode(false);
          reload();
          return true;
        }}
      >
        <ProFormSelect
          name="warehouseName"
          label="仓库"
          options={WAREHOUSE_OPTIONS.map((item) => ({ label: item, value: item }))}
          rules={[{ required: true }]}
        />
      </ModalForm>

      <Drawer
        width={560}
        title="分仓依据"
        open={Boolean(drawerRow)}
        onClose={() => setDrawerRow(undefined)}
        destroyOnClose
      >
        {drawerRow ? (
          <ProDescriptions<ERP.OrderListItem>
            column={1}
            dataSource={drawerRow}
            columns={[
              { title: '订单号', dataIndex: 'orderNo' },
              { title: 'Shopee 状态', render: (_, record) => renderStatusTag(record.orderStatus, ORDER_STATUS_OPTIONS) },
              { title: '分仓状态', render: (_, record) => renderStatusTag(record.warehouseStatus, WAREHOUSE_STATUS_OPTIONS) },
              { title: '当前仓库', dataIndex: 'warehouseName' },
              { title: '推荐仓库', dataIndex: 'recommendedWarehouse' },
              { title: '分仓策略', dataIndex: 'allocationStrategy' },
              { title: '分仓依据', dataIndex: 'allocationReason' },
              { title: '库存预警', dataIndex: 'stockWarning' },
              { title: '库存状态', render: (_, record) => (record.stockSufficient ? '库存充足' : '库存不足') },
            ]}
          />
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default WarehouseAllocationPage;
