import {
  PlusOutlined,
  ReloadOutlined,
  StockOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useMemo, useRef, useState } from 'react';
import {
  adjustInventory,
  createWarehouse,
  queryInventoryBalances,
  queryWarehouses,
} from '@/services/erp/inventory';
import { queryErpSkus } from '@/services/erp/product';
import '@/pages/product/list/style.less';
import './style.less';

const StockPage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const actionRef = useRef<ActionType | null>(null);
  const [warehouseForm] = Form.useForm<ERP.WarehouseSavePayload>();
  const [adjustForm] = Form.useForm<ERP.InventoryAdjustPayload>();
  const [warehouseId, setWarehouseId] = useState<string>();
  const [keyword, setKeyword] = useState<string>();
  const [skuKeyword, setSkuKeyword] = useState<string>();
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: warehousesResponse, refetch: refetchWarehouses } = useQuery({
    queryKey: ['inventory-warehouses'],
    queryFn: queryWarehouses,
  });

  const { data: skusResponse, isFetching: loadingSkus } = useQuery({
    queryKey: ['inventory-skus', skuKeyword],
    queryFn: () =>
      queryErpSkus({ current: 1, pageSize: 50, keyword: skuKeyword }),
  });

  const warehouseOptions = useMemo(
    () =>
      (warehousesResponse?.data || []).map((warehouse) => ({
        label: `${warehouse.code} · ${warehouse.name}`,
        value: warehouse.id,
      })),
    [warehousesResponse?.data],
  );

  const skuOptions = useMemo(
    () =>
      (skusResponse?.data || []).map((sku) => ({
        label: `${sku.skuCode} · ${sku.productTitle}`,
        value: sku.skuId,
      })),
    [skusResponse?.data],
  );

  const submitWarehouse = async () => {
    const values = await warehouseForm.validateFields();
    setSaving(true);
    try {
      await createWarehouse(values);
      messageApi.success('仓库已创建');
      setWarehouseOpen(false);
      warehouseForm.resetFields();
      await refetchWarehouses();
    } catch {
      messageApi.error('创建仓库失败');
    } finally {
      setSaving(false);
    }
  };

  const submitAdjustment = async () => {
    const values = await adjustForm.validateFields();
    setSaving(true);
    try {
      await adjustInventory(values);
      messageApi.success('库存已调整');
      setAdjustOpen(false);
      adjustForm.resetFields();
      actionRef.current?.reload();
    } catch {
      messageApi.error('库存调整失败');
    } finally {
      setSaving(false);
    }
  };

  const columns: ProColumns<ERP.InventoryBalanceItem>[] = [
    {
      title: '商品 / SKU',
      dataIndex: 'productTitle',
      width: 320,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong ellipsis style={{ maxWidth: 300 }}>
            {record.productTitle}
          </Typography.Text>
          <Typography.Text type="secondary" copyable>
            {record.skuCode}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '仓库',
      dataIndex: 'warehouseName',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>{record.warehouseName}</Typography.Text>
          <Typography.Text type="secondary">{record.warehouseCode}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '账面库存',
      dataIndex: 'onHand',
      width: 120,
      align: 'right',
    },
    {
      title: '锁定库存',
      dataIndex: 'locked',
      width: 120,
      align: 'right',
      render: (_, record) =>
        record.locked > 0 ? <Tag color="processing">{record.locked}</Tag> : 0,
    },
    {
      title: '可售库存',
      dataIndex: 'salable',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Tag color={record.salable > 0 ? 'success' : 'error'}>
          {record.salable}
        </Tag>
      ),
    },
    {
      title: '安全库存',
      dataIndex: 'safetyStock',
      width: 120,
      align: 'right',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      renderText: (value) =>
        value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
    },
  ];

  return (
    <div className="erp-product-page erp-inventory-page">
      {contextHolder}
      <div className="erp-content">
        <div className="erp-filterbar">
          <Select
            allowClear
            placeholder="全部仓库"
            value={warehouseId}
            options={warehouseOptions}
            style={{ width: 240 }}
            onChange={(value) => {
              setWarehouseId(value);
              actionRef.current?.reload();
            }}
          />
          <Input.Search
            allowClear
            placeholder="搜索商品名 / SKU / 条码"
            style={{ width: 360 }}
            onSearch={(value) => {
              setKeyword(value || undefined);
              actionRef.current?.reload();
            }}
          />
          <div className="erp-toolbar-spacer" />
          <Button icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>
            刷新
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => setWarehouseOpen(true)}>
            新建仓库
          </Button>
          <Button
            type="primary"
            icon={<StockOutlined />}
            onClick={() => {
              adjustForm.setFieldsValue({ warehouseId });
              setAdjustOpen(true);
            }}
          >
            库存调整
          </Button>
        </div>

        <ProTable<ERP.InventoryBalanceItem, ERP.InventoryQueryParams>
          rowKey="id"
          actionRef={actionRef}
          className="erp-dense-table"
          search={false}
          columns={columns}
          scroll={{ x: 1180 }}
          request={async (params) => {
            try {
              return await queryInventoryBalances({
                ...params,
                warehouseId,
                keyword,
              });
            } catch {
              messageApi.error('库存列表请求失败');
              return { success: false, data: [], total: 0 };
            }
          }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          locale={{ emptyText: '暂无库存数据' }}
        />
      </div>

      <Modal
        title="新建仓库"
        open={warehouseOpen}
        confirmLoading={saving}
        onOk={submitWarehouse}
        onCancel={() => setWarehouseOpen(false)}
        okText="保存"
        destroyOnClose
      >
        <Form form={warehouseForm} layout="vertical">
          <Form.Item name="code" label="仓库编码" rules={[{ required: true }]}>
            <Input placeholder="例如 BR-SP-01" />
          </Form.Item>
          <Form.Item name="name" label="仓库名称" rules={[{ required: true }]}>
            <Input placeholder="例如 São Paulo 主仓" />
          </Form.Item>
          <Form.Item name="region" label="地区">
            <Input placeholder="BR / SP" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="库存调整"
        open={adjustOpen}
        confirmLoading={saving}
        onOk={submitAdjustment}
        onCancel={() => setAdjustOpen(false)}
        okText="确认调整"
        destroyOnClose
      >
        <Form form={adjustForm} layout="vertical">
          <Form.Item name="warehouseId" label="仓库" rules={[{ required: true }]}>
            <Select options={warehouseOptions} placeholder="选择仓库" />
          </Form.Item>
          <Form.Item name="skuId" label="本地 SKU" rules={[{ required: true }]}>
            <Select
              showSearch
              loading={loadingSkus}
              filterOption={false}
              options={skuOptions}
              placeholder="搜索并选择 SKU"
              onSearch={(value) => setSkuKeyword(value || undefined)}
            />
          </Form.Item>
          <Form.Item name="quantity" label="调整数量" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} placeholder="入库填正数，扣减填负数" />
          </Form.Item>
          <Form.Item name="safetyStock" label="安全库存">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StockPage;
