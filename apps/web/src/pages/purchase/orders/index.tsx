import {
  CheckCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useMemo, useRef, useState } from 'react';
import { queryWarehouses } from '@/services/erp/inventory';
import { queryErpSkus } from '@/services/erp/product';
import {
  createPurchaseOrder,
  createSupplier,
  getPurchaseOrder,
  queryPurchaseOrders,
  querySuppliers,
  receivePurchaseOrder,
} from '@/services/erp/purchase';
import '@/pages/product/list/style.less';
import './style.less';

const statusColor: Record<string, string> = {
  DRAFT: 'default',
  SUBMITTED: 'processing',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'error',
};

const PurchaseOrdersPage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const actionRef = useRef<ActionType | null>(null);
  const [supplierForm] = Form.useForm<ERP.SupplierSavePayload>();
  const [orderForm] = Form.useForm<ERP.PurchaseOrderSavePayload>();
  const [receiveForm] = Form.useForm<ERP.PurchaseReceivePayload>();
  const [status, setStatus] = useState<string>();
  const [keyword, setKeyword] = useState<string>();
  const [skuKeyword, setSkuKeyword] = useState<string>();
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<ERP.PurchaseOrderDetail>();
  const [saving, setSaving] = useState(false);

  const { data: suppliersResponse, refetch: refetchSuppliers } = useQuery({
    queryKey: ['purchase-suppliers'],
    queryFn: () => querySuppliers(),
  });
  const { data: warehousesResponse } = useQuery({
    queryKey: ['purchase-warehouses'],
    queryFn: queryWarehouses,
  });
  const { data: skusResponse, isFetching: loadingSkus } = useQuery({
    queryKey: ['purchase-skus', skuKeyword],
    queryFn: () =>
      queryErpSkus({ current: 1, pageSize: 50, keyword: skuKeyword }),
  });

  const supplierOptions = useMemo(
    () =>
      (suppliersResponse?.data || []).map((supplier) => ({
        label: `${supplier.code} · ${supplier.name}`,
        value: supplier.id,
      })),
    [suppliersResponse?.data],
  );
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

  const submitSupplier = async () => {
    const values = await supplierForm.validateFields();
    setSaving(true);
    try {
      await createSupplier({ ...values, currency: values.currency || 'BRL' });
      messageApi.success('供应商已创建');
      setSupplierOpen(false);
      supplierForm.resetFields();
      await refetchSuppliers();
    } catch {
      messageApi.error('创建供应商失败');
    } finally {
      setSaving(false);
    }
  };

  const submitOrder = async () => {
    const values = await orderForm.validateFields();
    const expectedArriveAt = values.expectedArriveAt as unknown as
      | string
      | { format?: (format: string) => string }
      | undefined;
    setSaving(true);
    try {
      await createPurchaseOrder({
        ...values,
        currency: values.currency || 'BRL',
        expectedArriveAt:
          typeof expectedArriveAt === 'string'
            ? expectedArriveAt
            : expectedArriveAt?.format?.('YYYY-MM-DD'),
      });
      messageApi.success('采购单已创建');
      setOrderOpen(false);
      orderForm.resetFields();
      actionRef.current?.reload();
    } catch {
      messageApi.error('创建采购单失败');
    } finally {
      setSaving(false);
    }
  };

  const openReceive = async (record: ERP.PurchaseOrderListItem) => {
    try {
      const response = await getPurchaseOrder(record.id);
      setReceivingOrder(response.data);
      receiveForm.setFieldsValue({
        warehouseId: response.data.warehouseId || undefined,
        items: response.data.items
          .filter((item) => item.receivedQuantity < item.quantity)
          .map((item) => ({
            itemId: item.id,
            quantity: item.quantity - item.receivedQuantity,
          })),
      });
      setReceiveOpen(true);
    } catch {
      messageApi.error('采购单详情请求失败');
    }
  };

  const submitReceive = async () => {
    if (!receivingOrder) return;
    const values = await receiveForm.validateFields();
    setSaving(true);
    try {
      await receivePurchaseOrder(receivingOrder.id, values);
      messageApi.success('收货入库完成');
      setReceiveOpen(false);
      setReceivingOrder(undefined);
      receiveForm.resetFields();
      actionRef.current?.reload();
    } catch {
      messageApi.error('收货入库失败');
    } finally {
      setSaving(false);
    }
  };

  const columns: ProColumns<ERP.PurchaseOrderListItem>[] = [
    {
      title: '采购单号',
      dataIndex: 'orderNo',
      width: 190,
      renderText: (value) => value || '-',
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
      width: 220,
    },
    {
      title: '仓库',
      dataIndex: 'warehouseName',
      width: 160,
      renderText: (value) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 150,
      render: (_, record) => (
        <Tag color={statusColor[record.status] || 'default'}>{record.status}</Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'totalQuantity',
      width: 140,
      align: 'right',
      render: (_, record) => `${record.receivedQuantity}/${record.totalQuantity}`,
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      width: 140,
      align: 'right',
      renderText: (value, record) =>
        value ? `${record.currency} ${value}` : '-',
    },
    {
      title: '预计到货',
      dataIndex: 'expectedArriveAt',
      width: 150,
      renderText: (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      renderText: (value) =>
        value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 130,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          disabled={record.status === 'RECEIVED' || record.status === 'CANCELLED'}
          onClick={() => openReceive(record)}
        >
          收货入库
        </Button>
      ),
    },
  ];

  return (
    <div className="erp-product-page erp-purchase-page">
      {contextHolder}
      <div className="erp-content">
        <div className="erp-filterbar">
          <Select
            allowClear
            placeholder="全部状态"
            value={status}
            style={{ width: 180 }}
            options={[
              { label: '已提交', value: 'SUBMITTED' },
              { label: '部分收货', value: 'PARTIALLY_RECEIVED' },
              { label: '已收货', value: 'RECEIVED' },
              { label: '已取消', value: 'CANCELLED' },
            ]}
            onChange={(value) => {
              setStatus(value);
              actionRef.current?.reload();
            }}
          />
          <Input.Search
            allowClear
            placeholder="搜索采购单 / 供应商 / SKU"
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
          <Button icon={<UserAddOutlined />} onClick={() => setSupplierOpen(true)}>
            新建供应商
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOrderOpen(true)}>
            新建采购单
          </Button>
        </div>

        <ProTable<ERP.PurchaseOrderListItem, ERP.PurchaseOrderQueryParams>
          rowKey="id"
          actionRef={actionRef}
          className="erp-dense-table"
          search={false}
          columns={columns}
          scroll={{ x: 1320 }}
          request={async (params) => {
            try {
              return await queryPurchaseOrders({ ...params, status, keyword });
            } catch {
              messageApi.error('采购单列表请求失败');
              return { success: false, data: [], total: 0 };
            }
          }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          locale={{ emptyText: '暂无采购单' }}
        />
      </div>

      <Modal
        title="新建供应商"
        open={supplierOpen}
        confirmLoading={saving}
        onOk={submitSupplier}
        onCancel={() => setSupplierOpen(false)}
        okText="保存"
        destroyOnClose
      >
        <Form form={supplierForm} layout="vertical" initialValues={{ currency: 'BRL', active: true }}>
          <Form.Item name="code" label="供应商编码" rules={[{ required: true }]}>
            <Input placeholder="SUP-001" />
          </Form.Item>
          <Form.Item name="name" label="供应商名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contactName" label="联系人">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
          <Form.Item name="currency" label="币种">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新建采购单"
        open={orderOpen}
        confirmLoading={saving}
        onOk={submitOrder}
        onCancel={() => setOrderOpen(false)}
        okText="创建"
        width={760}
        destroyOnClose
      >
        <Form form={orderForm} layout="vertical" initialValues={{ currency: 'BRL', items: [{}] }}>
          <Space align="start" size={12} style={{ width: '100%' }}>
            <Form.Item name="supplierId" label="供应商" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={supplierOptions} placeholder="选择供应商" />
            </Form.Item>
            <Form.Item name="warehouseId" label="默认入库仓" style={{ flex: 1 }}>
              <Select allowClear options={warehouseOptions} placeholder="可在收货时选择" />
            </Form.Item>
          </Space>
          <Space align="start" size={12} style={{ width: '100%' }}>
            <Form.Item name="currency" label="币种" style={{ width: 120 }}>
              <Input />
            </Form.Item>
            <Form.Item name="expectedArriveAt" label="预计到货">
              <DatePicker style={{ width: 180 }} />
            </Form.Item>
          </Space>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {fields.map((field) => (
                  <Space key={field.key} align="start" size={8} className="erp-purchase-item-row">
                    <Form.Item
                      {...field}
                      name={[field.name, 'skuId']}
                      rules={[{ required: true }]}
                    >
                      <Select
                        showSearch
                        loading={loadingSkus}
                        filterOption={false}
                        options={skuOptions}
                        placeholder="搜索本地 SKU"
                        style={{ width: 300 }}
                        onSearch={(value) => setSkuKeyword(value || undefined)}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'quantity']}
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={1} placeholder="数量" style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'unitCost']}>
                      <InputNumber min={0} placeholder="单价" style={{ width: 120 }} />
                    </Form.Item>
                    <Button disabled={fields.length === 1} onClick={() => remove(field.name)}>
                      删除
                    </Button>
                  </Space>
                ))}
                <Button block onClick={() => add({})}>
                  添加 SKU
                </Button>
              </Space>
            )}
          </Form.List>
          <Form.Item name="remark" label="备注" style={{ marginTop: 12 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="收货入库"
        open={receiveOpen}
        confirmLoading={saving}
        onOk={submitReceive}
        onCancel={() => setReceiveOpen(false)}
        okText="确认入库"
        width={720}
        destroyOnClose
      >
        <Form form={receiveForm} layout="vertical">
          <Form.Item name="warehouseId" label="入库仓库" rules={[{ required: true }]}>
            <Select options={warehouseOptions} placeholder="选择入库仓库" />
          </Form.Item>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={receivingOrder?.items || []}
            columns={[
              {
                title: 'SKU',
                dataIndex: 'skuCode',
                render: (_, item: ERP.PurchaseOrderItem) => (
                  <Space direction="vertical" size={0}>
                    <Typography.Text>{item.skuCode}</Typography.Text>
                    <Typography.Text type="secondary">{item.productTitle}</Typography.Text>
                  </Space>
                ),
              },
              {
                title: '待收',
                width: 90,
                render: (_, item: ERP.PurchaseOrderItem) =>
                  item.quantity - item.receivedQuantity,
              },
              {
                title: '本次入库',
                width: 150,
                render: (_, item: ERP.PurchaseOrderItem, index) => (
                  <>
                    <Form.Item name={['items', index, 'itemId']} initialValue={item.id} hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name={['items', index, 'quantity']}
                      initialValue={item.quantity - item.receivedQuantity}
                      rules={[{ required: true }]}
                      style={{ margin: 0 }}
                    >
                      <InputNumber min={1} max={item.quantity - item.receivedQuantity} />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
          <Form.Item name="note" label="入库备注" style={{ marginTop: 12 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Typography.Text type="secondary">
            <CheckCircleOutlined /> 入库后会写入库存余额和库存流水。
          </Typography.Text>
        </Form>
      </Modal>
    </div>
  );
};

export default PurchaseOrdersPage;
