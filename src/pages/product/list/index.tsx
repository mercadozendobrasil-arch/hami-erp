import {
  DownOutlined,
  ExportOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { history, useLocation } from '@umijs/max';
import {
  Alert,
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
import { formatBrazilCurrency } from '@/pages/order/utils/br';
import {
  queryProducts,
  syncProduct,
  unlistProduct,
} from '@/services/erp/product';
import { queryShops } from '@/services/erp/shop';
import './style.less';

type ProductRecord = ERP.ProductListItem & Record<string, any>;

const { Sider, Content } = Layout;

const sideMenus = [
  { key: 'draft', label: '草稿箱', count: 0 },
  { key: 'publishing', label: '发布中', count: 0 },
  { key: 'publish_failed', label: '发布失败', count: 0 },
  { key: 'ACTIVE', label: '在线产品', count: 0 },
  { key: 'boosted', label: '置顶产品', count: 0 },
  { key: 'auto_template', label: '汽配模板', count: 0 },
];

const statusTabs = [
  { key: 'ACTIVE', label: '在线' },
  { key: 'SOLD_OUT', label: '售完' },
  { key: 'INACTIVE', label: '已下架' },
  { key: 'REVIEWING', label: '审核中' },
  { key: 'BANNED', label: '违规' },
  { key: 'DELETED', label: '疑似删除' },
];

const statusColor: Record<string, string> = {
  ACTIVE: 'success',
  SOLD_OUT: 'warning',
  INACTIVE: 'default',
  REVIEWING: 'processing',
  BANNED: 'error',
  DELETED: 'default',
  UNKNOWN: 'default',
};

function formatTime(value?: string) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-';
}

function pickFirst(record: ProductRecord, keys: string[]) {
  return keys
    .map((key) => record[key])
    .find((value) => value !== undefined && value !== null && value !== '');
}

function getProductId(record: ProductRecord) {
  return String(
    pickFirst(record, [
      'platformProductId',
      'itemId',
      'item_id',
      'productId',
      'id',
    ]) || '',
  );
}

function getProductImage(record: ProductRecord) {
  return pickFirst(record, [
    'image',
    'imageUrl',
    'coverImage',
    'thumbnail',
    'mainImage',
    'image_url',
  ]);
}

function getShopId(record: ProductRecord, fallback?: string) {
  return String(
    pickFirst(record, ['shopId', 'platformShopId', 'shop_id']) ||
      fallback ||
      '',
  );
}

const ProductListPage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const actionRef = useRef<ActionType | null>(null);
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const initialShopId = searchParams.get('shopId') || undefined;
  const [shopId, setShopId] = useState(initialShopId);
  const [keyword, setKeyword] = useState<string>();
  const [dateRange, setDateRange] = useState<[string, string]>();
  const [status, setStatus] = useState('ACTIVE');
  const [selectedRows, setSelectedRows] = useState<ProductRecord[]>([]);

  const { data: shopsResponse } = useQuery({
    queryKey: ['product-list-shops'],
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

  const unavailable = () => messageApi.info('暂未接入');

  const syncOne = async (record: ProductRecord) => {
    try {
      await syncProduct(getProductId(record), getShopId(record, shopId));
      messageApi.success('已触发同步');
      actionRef.current?.reload();
    } catch {
      messageApi.error('同步失败');
    }
  };

  const unlistOne = async (record: ProductRecord) => {
    try {
      await unlistProduct(getProductId(record), getShopId(record, shopId));
      messageApi.success('已提交下架');
      actionRef.current?.reload();
    } catch {
      messageApi.error('下架失败');
    }
  };

  const columns: ProColumns<ProductRecord>[] = [
    {
      title: '产品标题',
      dataIndex: 'title',
      width: 330,
      fixed: 'left',
      render: (_, record) => (
        <Space align="start" size={10}>
          <Image
            width={46}
            height={46}
            src={getProductImage(record)}
            fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='46' height='46'%3E%3Crect width='46' height='46' fill='%23f5f7fa'/%3E%3Ctext x='23' y='27' text-anchor='middle' font-size='10' fill='%23999'%3ENo Img%3C/text%3E%3C/svg%3E"
            style={{ objectFit: 'cover', borderRadius: 4 }}
            preview={Boolean(getProductImage(record))}
          />
          <Space direction="vertical" size={2}>
            <Typography.Link ellipsis style={{ maxWidth: 240 }}>
              {record.title || '-'}
            </Typography.Link>
            <Typography.Text type="secondary">
              {record.shopName || record.brand || '-'}
            </Typography.Text>
            <Space size={4} wrap>
              <Tag color={statusColor[record.status] || 'default'}>
                {record.status || 'UNKNOWN'}
              </Tag>
              {Number(record.skuCount || record.modelCount) > 0 ? (
                <Typography.Link>{`多变种 (${record.skuCount || record.modelCount})`}</Typography.Link>
              ) : null}
            </Space>
          </Space>
        </Space>
      ),
    },
    {
      title: '父SKU/产品ID',
      dataIndex: 'platformProductId',
      width: 190,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>
            {pickFirst(record, ['parentSku', 'parentSKU', 'sku']) || '-'}
          </Typography.Text>
          <Typography.Link copyable>
            {getProductId(record) || '-'}
          </Typography.Link>
        </Space>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 150,
      align: 'right',
      renderText: (value) => (value ? formatBrazilCurrency(value, 'BRL') : '-'),
    },
    {
      title: '折扣价',
      dataIndex: 'discountPrice',
      width: 150,
      align: 'right',
      render: (_, record) => {
        const value = pickFirst(record, [
          'discountPrice',
          'promotionPrice',
          'salePrice',
        ]);
        return value ? (
          <Typography.Link>
            {formatBrazilCurrency(value, 'BRL')}
          </Typography.Link>
        ) : (
          '-'
        );
      },
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Typography.Text>{record.stock ?? '-'}</Typography.Text>
      ),
    },
    {
      title: '产品表现',
      dataIndex: 'performance',
      width: 160,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text type="secondary">
            销量: {record.sales ?? '-'}
          </Typography.Text>
          <Typography.Text type="secondary">
            收藏量: {record.likes ?? record.favoriteCount ?? '-'}
          </Typography.Text>
          <Typography.Text type="secondary">
            浏览量: {record.views ?? record.viewCount ?? '-'}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '更新时间/发布时间',
      dataIndex: 'updatedAt',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>
            {formatTime(record.updatedAt || record.updateTime)}
          </Typography.Text>
          <Typography.Text>
            {formatTime(record.publishedAt || record.createTime)}
          </Typography.Text>
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
          <Button type="link" size="small" onClick={unavailable}>
            编辑
          </Button>
          <Dropdown
            menu={{
              items: [
                { key: 'sync', label: '同步' },
                { key: 'boost', label: '加入自动置顶', disabled: true },
                { key: 'copy', label: '复制为新产品', disabled: true },
                { key: 'unlist', label: '下架' },
                { key: 'delete', label: '删除', disabled: true, danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'sync') syncOne(record);
                if (key === 'unlist') unlistOne(record);
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
      <div className="erp-product-page">
        {contextHolder}
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="请先选择店铺"
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
    <Layout className="erp-product-page">
      {contextHolder}
      <Sider width={228} theme="light" className="erp-side">
        <div className="erp-side-title">Shopee产品管理</div>
        <Menu
          mode="inline"
          selectedKeys={[status]}
          onClick={({ key }) => setStatus(String(key))}
          items={sideMenus.map((item) => ({
            key: item.key,
            label: (
              <span className="erp-menu-item">
                <span>{item.label}</span>
                <Typography.Text type="secondary">{item.count}</Typography.Text>
              </span>
            ),
          }))}
        />
      </Sider>
      <Content className="erp-content">
        <div className="erp-filterbar">
          <Input.Search
            allowClear
            placeholder="产品标题"
            style={{ width: 360 }}
            onSearch={(value) => {
              setKeyword(value || undefined);
              actionRef.current?.reload();
            }}
          />
          <Select
            value="更新时间"
            style={{ width: 110 }}
            options={[
              { label: '更新时间', value: '更新时间' },
              { label: '发布时间', value: '发布时间' },
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
            placeholder="全部店铺"
            value={shopId}
            options={shopOptions}
            style={{ width: 180 }}
            onChange={(value) => {
              setShopId(value);
              history.replace(`/product/list?shopId=${value}`);
            }}
          />
          <Button icon={<FilterOutlined />} onClick={unavailable} />
          <div className="erp-toolbar-spacer" />
          <Button
            icon={<SyncOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            同步
          </Button>
          <Dropdown
            menu={{
              items: [
                { key: 'import', label: '导入产品', disabled: true },
                { key: 'export', label: '导出产品', disabled: true },
              ],
            }}
          >
            <Button icon={<ExportOutlined />}>导入 & 导出</Button>
          </Dropdown>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => history.push(`/product/create?shopId=${shopId}`)}
          >
            创建产品
          </Button>
        </div>

        <div className="erp-tabs">
          {statusTabs.map((item) => (
            <Button
              key={item.key}
              type={status === item.key ? 'primary' : 'text'}
              onClick={() => setStatus(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <ProTable<ProductRecord, ERP.PageParams>
          rowKey={(record) => getProductId(record)}
          actionRef={actionRef}
          className="erp-dense-table"
          search={false}
          columns={columns}
          scroll={{ x: 1400 }}
          rowSelection={{
            selectedRowKeys: selectedRows.map(getProductId),
            onChange: (_, rows) => setSelectedRows(rows),
          }}
          request={async (params) => {
            try {
              return await queryProducts({
                ...params,
                shopId,
                title: keyword,
                status,
                startTime: dateRange?.[0],
                endTime: dateRange?.[1],
              } as ERP.PageParams);
            } catch {
              messageApi.error('产品列表请求失败');
              return { success: false, data: [], total: 0 };
            }
          }}
          pagination={{ pageSize: 50, showSizeChanger: true }}
          locale={{ emptyText: '暂无产品数据' }}
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
                  批量编辑
                </Button>
                <Button
                  size="small"
                  disabled={!selectedRows.length}
                  onClick={unavailable}
                >
                  批量操作
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

export default ProductListPage;
