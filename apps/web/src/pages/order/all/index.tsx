import {
  DownOutlined,
  ExportOutlined,
  FilterOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SyncOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useMutation, useQuery } from '@tanstack/react-query';
import { history, useLocation } from '@umijs/max';
import {
  Button,
  DatePicker,
  Dropdown,
  Empty,
  Image,
  Input,
  Layout,
  Menu,
  message,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useMemo, useRef, useState } from 'react';
import {
  cancelOrders,
  queryOrders,
  syncOrderDetailNow,
  updateOrderRemark,
} from '@/services/erp/order';
import { queryShops, syncShopeeOrdersByShop } from '@/services/erp/shop';
import { formatBrazilCurrency } from '../utils/br';
import './style.less';

type OrderRecord = ERP.OrderListItem & Record<string, any>;

const { Sider, Content } = Layout;

const sideSections = [
  { key: 'all', label: '全部订单' },
  { key: 'recent', label: '近期订单' },
  { key: 'history', label: '历史订单' },
  { key: 'warehousePending', label: '待分配' },
  { key: 'PENDING_INVOICE', label: '待开票' },
  { key: 'READY_TO_SHIP', label: '待发货' },
  { key: 'printPending', label: '待打单' },
  { key: 'PROCESSED', label: '待揽收' },
  { key: 'SHIPPED', label: '已发货' },
  { key: 'locked', label: '已搁置' },
  { key: 'wavePick', label: '波次拣货' },
];

const stageTabs = [
  { key: 'READY_TO_SHIP', label: '待发货' },
  { key: 'PENDING_INVOICE', label: '待开票' },
  { key: 'PROCESSED', label: '待揽收' },
  { key: 'SHIPPED', label: '已发货' },
  { key: 'TO_CONFIRM_RECEIVE', label: '待收货' },
  { key: 'COMPLETED', label: '已完成' },
  { key: 'CANCELLED', label: '已取消' },
];

const orderStatusLabel: Record<string, string> = {
  UNPAID: '待付款',
  PENDING_INVOICE: '待开票',
  READY_TO_SHIP: '待发货',
  PROCESSED: '待揽收',
  SHIPPED: '已发货',
  TO_CONFIRM_RECEIVE: '待收货',
  COMPLETED: '已完成',
  IN_CANCEL: '取消中',
  CANCELLED: '已取消',
  RETRY_SHIP: '重新发货',
  TO_RETURN: '退货中',
};

const orderStatusColor: Record<string, string> = {
  UNPAID: 'warning',
  PENDING_INVOICE: 'processing',
  READY_TO_SHIP: 'blue',
  PROCESSED: 'cyan',
  SHIPPED: 'purple',
  TO_CONFIRM_RECEIVE: 'gold',
  COMPLETED: 'success',
  IN_CANCEL: 'orange',
  CANCELLED: 'default',
  RETRY_SHIP: 'error',
  TO_RETURN: 'magenta',
};

function formatTime(value?: string) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-';
}

function getRemainingShipTime(value?: string) {
  if (!value) return '-';
  const diffMinutes = dayjs(value).diff(dayjs(), 'minute');
  if (diffMinutes <= 0) return '已超时';
  const days = Math.floor(diffMinutes / 1440);
  const hours = Math.floor((diffMinutes % 1440) / 60);
  const minutes = diffMinutes % 60;
  return `${days}d ${hours}h ${minutes}m`;
}

function firstItem(record: OrderRecord) {
  return record.itemList?.[0] || record.packageList?.[0]?.itemList?.[0] || {};
}

function itemImage(record: OrderRecord) {
  return firstItem(record).image || record.image || record.productImage;
}

function itemTitle(record: OrderRecord) {
  return firstItem(record).skuName || record.items || '-';
}

function itemSku(record: OrderRecord) {
  return firstItem(record).skuId || record.sku || '-';
}

const OrderAllPage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const actionRef = useRef<ActionType | null>(null);
  const location = useLocation();
  const initialShopId = useMemo(
    () => new URLSearchParams(location.search).get('shopId') || undefined,
    [location.search],
  );
  const [shopId, setShopId] = useState(initialShopId);
  const [keyword, setKeyword] = useState<string>();
  const [dateRange, setDateRange] = useState<[string, string]>();
  const [currentTab, setCurrentTab] = useState('READY_TO_SHIP');
  const [selectedRows, setSelectedRows] = useState<OrderRecord[]>([]);

  const { data: shopsResponse } = useQuery({
    queryKey: ['order-all-shops'],
    queryFn: () => queryShops({ current: 1, pageSize: 100 }),
  });

  const shopOptions = useMemo(
    () =>
      (shopsResponse?.data || []).map((shop) => ({
        label: shop.shopName,
        value: shop.shopId,
      })),
    [shopsResponse?.data],
  );

  const syncShopMutation = useMutation({
    mutationFn: (targetShopId: string) => syncShopeeOrdersByShop(targetShopId),
    onSuccess: () => {
      messageApi.success('已触发订单同步');
      actionRef.current?.reload();
    },
    onError: () => messageApi.error('订单同步失败'),
  });

  const unavailable = () => messageApi.info('暂未接入');

  const syncOne = async (record: OrderRecord) => {
    try {
      await syncOrderDetailNow({
        orderId: record.id,
        orderNo: record.orderNo,
        orderSn: record.orderSn,
        shopId: record.platformShopId || shopId,
      });
      messageApi.success('已触发同步');
      actionRef.current?.reload();
    } catch {
      messageApi.error('同步失败');
    }
  };

  const cancelOne = async (record: OrderRecord) => {
    try {
      await cancelOrders({
        orderIds: [record.id],
        orderNo: record.orderNo,
        orderSn: record.orderSn,
        shopId,
      });
      messageApi.success('已提交取消订单');
      actionRef.current?.reload();
    } catch {
      messageApi.error('取消订单失败');
    }
  };

  const remarkOne = async (record: OrderRecord) => {
    try {
      await updateOrderRemark({
        orderIds: [record.id],
        orderNo: record.orderNo,
        orderSn: record.orderSn,
        shopId,
        remark: record.remark || '',
      });
      messageApi.success('已提交客服备注');
      actionRef.current?.reload();
    } catch {
      messageApi.error('客服备注失败');
    }
  };

  const columns: ProColumns<OrderRecord>[] = [
    {
      title: '产品',
      dataIndex: 'items',
      width: 520,
      fixed: 'left',
      render: (_, record) => (
        <div className="erp-order-product">
          <div className="erp-order-line">
            <Typography.Link copyable>
              #{record.orderNo || record.orderSn}
            </Typography.Link>
            <Tag color="blue">{record.platform || 'Shopee'}</Tag>
            <Typography.Text type="secondary">
              {record.shopName || '-'}
            </Typography.Text>
          </div>
          <Space align="start" size={10}>
            <Image
              width={48}
              height={48}
              src={itemImage(record)}
              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23f5f7fa'/%3E%3Ctext x='24' y='28' text-anchor='middle' font-size='10' fill='%23999'%3ENo Img%3C/text%3E%3C/svg%3E"
              style={{ objectFit: 'cover', borderRadius: 4 }}
              preview={Boolean(itemImage(record))}
            />
            <Space direction="vertical" size={2}>
              <Typography.Link ellipsis style={{ maxWidth: 360 }}>
                {itemTitle(record)}
              </Typography.Link>
              <Typography.Text>{itemSku(record)}</Typography.Text>
              <Typography.Text strong>
                x {firstItem(record).quantity || record.skuCount || 1}
              </Typography.Text>
            </Space>
          </Space>
        </div>
      ),
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      renderText: (value, record) =>
        formatBrazilCurrency(value, record.currency || 'BRL'),
    },
    {
      title: '收件人',
      dataIndex: 'buyerName',
      width: 210,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>
            {record.addressInfo?.receiverName || record.buyerName || '-'}
          </Typography.Text>
          <Typography.Text type="secondary">
            {[record.addressInfo?.city, record.addressInfo?.state]
              .filter(Boolean)
              .join(', ') ||
              record.buyerCityState ||
              '-'}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '平台订单号',
      dataIndex: 'platformOrderNo',
      width: 190,
      copyable: true,
      renderText: (_, record) =>
        record.platformOrderNo || record.orderSn || '-',
    },
    {
      title: '时间',
      dataIndex: 'orderTime',
      width: 170,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text type="secondary">下单</Typography.Text>
          <Typography.Text>
            {formatTime(record.orderTime || record.createTime)}
          </Typography.Text>
          <Typography.Text type="secondary">付款</Typography.Text>
          <Typography.Text>
            {formatTime(record.paymentInfo?.paidAt || record.updateTime)}
          </Typography.Text>
          <Typography.Text
            type={
              dayjs(record.shipByDate).isBefore(dayjs()) ? 'danger' : undefined
            }
          >
            剩余发货 {getRemainingShipTime(record.shipByDate)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '物流方式',
      dataIndex: 'shippingCarrier',
      width: 190,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>
            {record.shippingCarrier ||
              record.checkoutShippingCarrier ||
              record.logisticsCompany ||
              '-'}
          </Typography.Text>
          <Typography.Text type="secondary">
            {record.trackingNo || record.packageNumber || '-'}
          </Typography.Text>
          <Tag>
            {record.logisticsInfo?.logisticsProfile ||
              record.packageList?.[0]?.logisticsProfile ||
              'Shopee'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'orderStatus',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Tag color={orderStatusColor[record.orderStatus] || 'default'}>
            {orderStatusLabel[record.orderStatus] || record.orderStatus || '-'}
          </Tag>
          <Tag>{record.payStatus || '-'}</Tag>
        </Space>
      ),
    },
    {
      title: '操作',
      dataIndex: 'actions',
      valueType: 'option',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Button
            type="link"
            size="small"
            onClick={() =>
              history.push(
                `/order/detail/${record.id}?shopId=${record.platformShopId || shopId}`,
              )
            }
          >
            详情
          </Button>
          <Dropdown
            menu={{
              items: [
                { key: 'sync', label: '同步' },
                { key: 'remark', label: '客服备注' },
                { key: 'cancel', label: '取消订单' },
                { key: 'hold', label: '搁置订单', disabled: true },
              ],
              onClick: ({ key }) => {
                if (key === 'sync') syncOne(record);
                if (key === 'remark') remarkOne(record);
                if (key === 'cancel') cancelOne(record);
              },
            }}
          >
            <Button type="link" size="small">
              更多 <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  if (!shopId) {
    return (
      <div className="erp-order-page">
        {contextHolder}
        <Empty
          description="请先选择店铺"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ paddingTop: 120 }}
        >
          <Button type="primary" onClick={() => history.push('/shop/list')}>
            返回店铺列表
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <Layout className="erp-order-page">
      {contextHolder}
      <Sider width={228} theme="light" className="erp-order-side">
        <div className="erp-side-title">订单</div>
        <Menu
          mode="inline"
          selectedKeys={[currentTab]}
          onClick={({ key }) => setCurrentTab(String(key))}
          items={sideSections.map((item) => ({
            key: item.key,
            label: item.label,
          }))}
        />
      </Sider>
      <Content className="erp-order-content">
        <div className="erp-order-filterbar">
          <Input.Search
            allowClear
            placeholder="订单号 / 平台订单号"
            style={{ width: 360 }}
            onSearch={(value) => {
              setKeyword(value || undefined);
              actionRef.current?.reload();
            }}
          />
          <Select
            value="下单时间"
            style={{ width: 110 }}
            options={[
              { label: '下单时间', value: '下单时间' },
              { label: '付款时间', value: '付款时间' },
            ]}
          />
          <DatePicker.RangePicker
            placeholder={['开始日期', '结束日期']}
            onChange={(_, values) =>
              setDateRange(
                values[0] && values[1] ? [values[0], values[1]] : undefined,
              )
            }
          />
          <Select
            value="Shopee"
            style={{ width: 150 }}
            options={[
              { label: '全部平台', value: 'all' },
              { label: 'Shopee', value: 'Shopee' },
            ]}
          />
          <Select
            placeholder="全部店铺"
            value={shopId}
            options={shopOptions}
            style={{ width: 180 }}
            onChange={(value) => {
              setShopId(value);
              history.replace(`/order/all?shopId=${value}`);
            }}
          />
          <Select
            placeholder="全部渠道"
            style={{ width: 150 }}
            options={[{ label: '全部渠道', value: 'all' }]}
          />
          <Select
            placeholder="包裹类型"
            style={{ width: 150 }}
            options={[{ label: '包裹类型', value: 'all' }]}
          />
          <div className="erp-toolbar-spacer" />
          <Dropdown
            menu={{
              items: [{ key: 'export', label: '导出订单', disabled: true }],
            }}
          >
            <Button icon={<ExportOutlined />}>导出</Button>
          </Dropdown>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            loading={syncShopMutation.isPending}
            onClick={() => syncShopMutation.mutate(shopId)}
          >
            同步订单
          </Button>
        </div>
        <div className="erp-order-filterbar secondary">
          <Select
            placeholder="全部打印状态"
            style={{ width: 150 }}
            options={[{ label: '全部打印状态', value: 'all' }]}
          />
          <Select
            placeholder="全部发票"
            style={{ width: 150 }}
            options={[{ label: '全部发票', value: 'all' }]}
          />
          <Button onClick={unavailable}>查看筛选模板</Button>
          <Button icon={<FilterOutlined />} onClick={unavailable} />
          <Button icon={<PrinterOutlined />} onClick={unavailable} />
          <Button
            icon={<UndoOutlined />}
            onClick={() => actionRef.current?.reload()}
          />
        </div>

        <div className="erp-tabs">
          {stageTabs.map((item) => (
            <Button
              key={item.key}
              type={currentTab === item.key ? 'primary' : 'text'}
              onClick={() => setCurrentTab(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <ProTable<OrderRecord, ERP.OrderQueryParams>
          rowKey="id"
          actionRef={actionRef}
          className="erp-order-table"
          search={false}
          columns={columns}
          scroll={{ x: 1650 }}
          rowSelection={{
            selectedRowKeys: selectedRows.map((item) => item.id),
            onChange: (_, rows) => setSelectedRows(rows),
          }}
          request={async (params, sort) => {
            try {
              return await queryOrders({
                ...params,
                shopId,
                orderNo: keyword,
                currentTab,
                orderStatus: stageTabs.some((item) => item.key === currentTab)
                  ? (currentTab as ERP.OrderStatus)
                  : undefined,
                startTime: dateRange?.[0],
                endTime: dateRange?.[1],
                sorter: sort as ERP.OrderQueryParams['sorter'],
              });
            } catch {
              messageApi.error('订单列表请求失败');
              return { success: false, data: [], total: 0 };
            }
          }}
          pagination={{ pageSize: 300, showSizeChanger: true }}
          locale={{ emptyText: '暂无数据' }}
          toolbar={{
            title: (
              <Space>
                <Typography.Text type="secondary">
                  已选择 {selectedRows.length}
                </Typography.Text>
                <Button
                  size="small"
                  disabled={!selectedRows.length}
                  onClick={unavailable}
                >
                  批量操作
                </Button>
                <Button
                  size="small"
                  disabled={!selectedRows.length}
                  onClick={unavailable}
                >
                  更多操作
                </Button>
              </Space>
            ),
          }}
          toolBarRender={() => [
            <Button
              key="refresh"
              icon={<ReloadOutlined />}
              onClick={() => actionRef.current?.reload()}
            >
              刷新
            </Button>,
          ]}
        />
      </Content>
    </Layout>
  );
};

export default OrderAllPage;
