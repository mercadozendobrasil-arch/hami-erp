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
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Dropdown,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Layout,
  Menu,
  message,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatBrazilCurrency } from '@/pages/order/utils/br';
import {
  getOnlineProductDetail,
  queryProducts,
  syncRemoteProducts,
  syncProduct,
  updateOnlineProduct,
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

function getLocalProductId(record: ProductRecord) {
  return String(pickFirst(record, ['productId', 'id']) || '');
}

function getShopeeItemId(record: ProductRecord) {
  return String(
    pickFirst(record, ['itemId', 'platformProductId', 'item_id']) || '',
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringifyValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function renderDescriptions(data?: Record<string, unknown>) {
  const entries = Object.entries(data || {}).filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  );
  if (!entries.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  return (
    <Descriptions size="small" bordered column={2}>
      {entries.map(([key, value]) => (
        <Descriptions.Item key={key} label={key}>
          <Typography.Text copyable={{ text: stringifyValue(value) }}>
            {stringifyValue(value)}
          </Typography.Text>
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}

function renderRecordTable(records?: Record<string, unknown>[]) {
  if (!records?.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  const keys = Array.from(new Set(records.flatMap((item) => Object.keys(item)))).slice(0, 8);
  return (
    <Table
      size="small"
      rowKey={(_, index) => String(index)}
      pagination={false}
      scroll={{ x: 900 }}
      dataSource={records}
      columns={keys.map((key) => ({
        title: key,
        dataIndex: key,
        key,
        ellipsis: true,
        render: (value: unknown) => stringifyValue(value),
      }))}
    />
  );
}

function getDetailPrice(detail?: ERP.ProductOnlineDetail, record?: ProductRecord) {
  const rawPrice = detail?.price ?? record?.price;
  return rawPrice === undefined ? undefined : Number(rawPrice);
}

function getDetailStock(detail?: ERP.ProductOnlineDetail, record?: ProductRecord) {
  const rawStock = detail?.stock ?? record?.stock;
  return rawStock === undefined ? undefined : Number(rawStock);
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
  const [editingProduct, setEditingProduct] = useState<ProductRecord>();
  const [editDetail, setEditDetail] = useState<ERP.ProductOnlineDetail>();
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm] = Form.useForm<ERP.ProductOnlineUpdatePayload>();

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

  useEffect(() => {
    const firstShopId = shopOptions[0]?.value;
    if (!shopId && firstShopId) {
      setShopId(firstShopId);
      history.replace(`/product/list?shopId=${firstShopId}`);
    }
  }, [shopId, shopOptions]);

  const unavailable = () => messageApi.info('暂未接入');

  const openEdit = async (record: ProductRecord) => {
    const currentShopId = getShopId(record, shopId);
    const productId = getLocalProductId(record);
    setEditingProduct(record);
    setEditDetail(undefined);
    editForm.setFieldsValue({
      shopId: currentShopId,
      title: record.title,
      price: record.price === undefined ? undefined : Number(record.price),
      stock: record.stock === undefined ? undefined : Number(record.stock),
    });

    if (!productId || !currentShopId) {
      messageApi.error('缺少商品或店铺ID，无法读取在线详情');
      return;
    }

    try {
      setEditLoading(true);
      const response = await getOnlineProductDetail(productId, currentShopId);
      const detail = response.data;
      setEditDetail(detail);
      editForm.setFieldsValue({
        shopId: currentShopId,
        title: detail.title,
        description: detail.description,
        price: getDetailPrice(detail, record),
        stock: getDetailStock(detail, record),
      });
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : '读取 Shopee 在线详情失败',
      );
    } finally {
      setEditLoading(false);
    }
  };

  const submitEdit = async () => {
    if (!editingProduct) return;
    const productId = getLocalProductId(editingProduct);
    if (!productId) {
      messageApi.error('缺少本地商品ID，无法编辑在线商品');
      return;
    }

    try {
      const values = await editForm.validateFields();
      setEditSubmitting(true);
      await updateOnlineProduct(productId, values);
      messageApi.success('已更新 Shopee 在线商品');
      setEditingProduct(undefined);
      actionRef.current?.reload();
    } catch (error) {
      if ((error as { errorFields?: unknown[] })?.errorFields) return;
      messageApi.error(error instanceof Error ? error.message : '在线商品编辑失败');
    } finally {
      setEditSubmitting(false);
    }
  };

  const syncRemote = async () => {
    if (!shopId) return;
    try {
      const response = await syncRemoteProducts(shopId);
      const synced = Number(response.data?.synced ?? 0);
      messageApi.success(`已同步 ${synced} 个商品`);
      actionRef.current?.reload();
    } catch {
      messageApi.error('同步失败');
    }
  };

  const syncOne = async (record: ProductRecord) => {
    try {
      await syncProduct(getLocalProductId(record), getShopId(record, shopId));
      messageApi.success('已触发同步');
      actionRef.current?.reload();
    } catch {
      messageApi.error('同步失败');
    }
  };

  const unlistOne = async (record: ProductRecord) => {
    try {
      await unlistProduct(getLocalProductId(record), getShopId(record, shopId));
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
            {getShopeeItemId(record) || getLocalProductId(record) || '-'}
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
          <Button type="link" size="small" onClick={() => openEdit(record)}>
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

  if (!shopId && !shopOptions.length) {
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
        <Modal
          title="Shopee / 编辑产品"
          open={Boolean(editingProduct)}
          confirmLoading={editSubmitting}
          onOk={submitEdit}
          okText="更新"
          cancelText="取消"
          onCancel={() => {
            setEditingProduct(undefined);
            setEditDetail(undefined);
          }}
          width="86vw"
          className="erp-shopee-editor-modal"
          destroyOnClose
        >
          <Spin spinning={editLoading}>
            <div className="erp-shopee-editor-shell">
              <div className="erp-shopee-editor-main">
                <Form
                  form={editForm}
                  layout="horizontal"
                  labelCol={{ flex: '130px' }}
                  wrapperCol={{ flex: '1 1 auto' }}
                  colon={false}
                  preserve={false}
                >
                  <Card id="erp-edit-basic" title="基本信息" size="small">
                    <Form.Item name="shopId" label="店铺" rules={[{ required: true }]}>
                      <Input disabled />
                    </Form.Item>
                    <Form.Item
                      name="title"
                      label="产品标题"
                      rules={[{ required: true, message: '请输入商品标题' }]}
                    >
                      <Input maxLength={120} showCount />
                    </Form.Item>
                    <Form.Item label="分类">
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          value={[
                            editDetail?.category?.categoryId,
                            editDetail?.category?.name,
                          ]
                            .filter(Boolean)
                            .join(' / ')}
                          placeholder="未读取到分类"
                          readOnly
                        />
                        <Button>选择分类</Button>
                      </Space.Compact>
                    </Form.Item>
                    <Form.Item name="description" label="产品描述">
                      <Input.TextArea rows={8} maxLength={3000} showCount />
                    </Form.Item>
                    <Form.Item label="父SKU">
                      <Input value={editingProduct?.parentSku || '-'} readOnly />
                    </Form.Item>
                    <Form.Item label="产品状况">
                      <Radio.Group value="NEW">
                        <Radio value="NEW">新品</Radio>
                        <Radio value="USED">二手</Radio>
                      </Radio.Group>
                    </Form.Item>
                    <Form.Item label="来源链接">
                      <Input placeholder="请输入" />
                    </Form.Item>
                  </Card>

                  <Card id="erp-edit-attributes" title="属性" size="small">
                    <Form.Item label="品牌">
                      <Input value={stringifyValue(editDetail?.brand)} readOnly />
                    </Form.Item>
                    {[
                      'Ingredient Feature',
                      'Peso do Produto',
                      'Produto personalizado',
                      'Delta especializada',
                      'Quantidade por Pacote',
                      'Aerosol',
                      'Duração da Garantia',
                      'Tamanho Do Pacote',
                      'Tipo de Garantia',
                      'Quantidade',
                      'Aroma',
                      'Volume',
                      'Dimensões do Produto',
                      'País de Origem',
                      'Tipo de Agente de Limpeza',
                      'Formulação',
                      'Número de Registro da FDA',
                    ].map((label) => (
                      <Form.Item key={label} label={label}>
                        <Input
                          value={stringifyValue(
                            (editDetail?.attributes || []).find((item) =>
                              stringifyValue(item).includes(label),
                            ),
                          )}
                          placeholder="请输入"
                          readOnly
                        />
                      </Form.Item>
                    ))}
                    <div className="erp-section-more">收起属性</div>
                  </Card>

                  <Card id="erp-edit-sales" title="销售信息" size="small">
                    <Form.Item label="类型">
                      <Radio.Group value={editDetail?.models?.length ? 'multi' : 'single'}>
                        <Radio value="single">单品</Radio>
                        <Radio value="multi">多变种</Radio>
                      </Radio.Group>
                    </Form.Item>
                    <Form.Item
                      name="price"
                      label="价格"
                      rules={[{ required: true, message: '请输入价格' }]}
                    >
                      <InputNumber min={0} precision={2} prefix="R$" style={{ width: 260 }} />
                    </Form.Item>
                    <Form.Item
                      name="stock"
                      label="库存"
                      rules={[{ required: true, message: '请输入库存' }]}
                    >
                      <InputNumber min={0} precision={0} style={{ width: 260 }} />
                    </Form.Item>
                    <Form.Item label="变种">
                      <div className="erp-variation-box">
                        <div className="erp-variation-toolbar">
                          <Button type="link">+ Shopee 颜色</Button>
                          <Button type="link">+ 颜色</Button>
                          <Button type="link">+ 尺寸</Button>
                          <Button type="link">+ 添加自定义变种</Button>
                        </div>
                        <Space wrap>
                          {(editDetail?.models?.length ? editDetail.models : [{ model_id: 0 }]).map(
                            (model, index) => (
                              <Checkbox key={String(model.model_id ?? index)} checked>
                                {stringifyValue(model.model_name ?? model.modelName ?? `Model ${index + 1}`)}
                              </Checkbox>
                            ),
                          )}
                        </Space>
                        <div className="erp-model-images">
                          {(editDetail?.images || []).slice(0, 3).map((image) => (
                            <Image
                              key={image.imageId || image.url}
                              width={64}
                              height={64}
                              src={image.url}
                              style={{ objectFit: 'cover', borderRadius: 4 }}
                            />
                          ))}
                        </div>
                      </div>
                    </Form.Item>
                    {renderRecordTable(editDetail?.models?.length ? editDetail.models : editDetail?.skus)}
                  </Card>

                  <Card id="erp-edit-media" title="媒体文件" size="small">
                    <Form.Item label="产品图片">
                      <div className="erp-template-media-grid">
                        {(editDetail?.images || []).map((image, index) => (
                          <div className="erp-template-media-item" key={image.imageId || image.url}>
                            <Image
                              width={86}
                              height={86}
                              src={image.url}
                              style={{ objectFit: 'cover' }}
                            />
                            <Typography.Text type="secondary">{index + 1}/9</Typography.Text>
                          </div>
                        ))}
                        {!editDetail?.images?.length ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : null}
                      </div>
                    </Form.Item>
                    <Form.Item label="产品视频">
                      {renderRecordTable((editDetail?.videos || []).map((video) => asRecord(video)))}
                    </Form.Item>
                  </Card>

                  <Card id="erp-edit-logistics" title="物流" size="small">
                    <Form.Item label="包裹重量">
                      <Space.Compact>
                        <InputNumber value={editDetail?.package?.weight} min={0} precision={2} />
                        <Input value="kg" style={{ width: 64 }} readOnly />
                      </Space.Compact>
                    </Form.Item>
                    <Form.Item label="包裹尺寸">
                      <Space>
                        <Input value={stringifyValue(asRecord(editDetail?.package?.dimension).package_length)} suffix="cm" readOnly />
                        <Input value={stringifyValue(asRecord(editDetail?.package?.dimension).package_width)} suffix="cm" readOnly />
                        <Input value={stringifyValue(asRecord(editDetail?.package?.dimension).package_height)} suffix="cm" readOnly />
                      </Space>
                    </Form.Item>
                    <Form.Item label="物流">
                      <div className="erp-logistics-list">
                        {(editDetail?.logistics || []).map((item, index) => (
                          <div className="erp-logistics-row" key={String(item.logistic_id ?? index)}>
                            <Checkbox checked={Boolean(item.enabled ?? true)} />
                            <div>
                              <Typography.Text strong>
                                {stringifyValue(item.logistic_name ?? item.logisticName ?? item.logistic_id)}
                              </Typography.Text>
                              <Typography.Text type="secondary">
                                {stringifyValue(item.shipping_fee ?? item.shippingFee ?? 'Shopee物流渠道')}
                              </Typography.Text>
                            </div>
                            <Typography.Text type="secondary">运费</Typography.Text>
                          </div>
                        ))}
                      </div>
                    </Form.Item>
                  </Card>

                  <Card id="erp-edit-tax" title="税务信息" size="small">
                    {[
                      ['NCM', 'ncm'],
                      ['CEST', 'cest'],
                      ['CFOP (同州)', 'same_state_cfop'],
                      ['CFOP (跨州)', 'diff_state_cfop'],
                      ['CSOSN', 'csosn'],
                      ['单位', 'measure_unit'],
                      ['原产地', 'origin'],
                    ].map(([label, key]) => (
                      <Form.Item key={key} label={label}>
                        <Input value={stringifyValue(editDetail?.tax?.[key])} readOnly />
                      </Form.Item>
                    ))}
                  </Card>
                </Form>
              </div>
              <div className="erp-shopee-editor-nav">
                {[
                  ['erp-edit-basic', '基本信息'],
                  ['erp-edit-attributes', '属性'],
                  ['erp-edit-sales', '销售信息'],
                  ['erp-edit-media', '媒体文件'],
                  ['erp-edit-logistics', '物流'],
                  ['erp-edit-tax', '税务信息'],
                ].map(([id, label]) => (
                  <a key={id} href={`#${id}`}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </Spin>
        </Modal>
        <Modal
          title="编辑在线商品"
          open={false}
          confirmLoading={editSubmitting}
          onOk={submitEdit}
          onCancel={() => {
            setEditingProduct(undefined);
            setEditDetail(undefined);
          }}
          width={1120}
          destroyOnClose
        >
          <Spin spinning={editLoading}>
            <Tabs
              items={[
                {
                  key: 'basic',
                  label: '基础信息',
                  children: (
                    <div className="erp-online-editor-grid">
                      <Form form={editForm} layout="vertical" preserve={false}>
                        <Form.Item name="shopId" label="店铺" rules={[{ required: true }]}>
                          <Input disabled />
                        </Form.Item>
                        <Form.Item
                          name="title"
                          label="商品标题"
                          rules={[{ required: true, message: '请输入商品标题' }]}
                        >
                          <Input maxLength={120} showCount />
                        </Form.Item>
                        <Form.Item name="description" label="商品描述">
                          <Input.TextArea rows={7} maxLength={3000} showCount />
                        </Form.Item>
                        <Space size={12} style={{ width: '100%' }}>
                          <Form.Item
                            name="price"
                            label="价格"
                            rules={[{ required: true, message: '请输入价格' }]}
                            style={{ flex: 1 }}
                          >
                            <InputNumber min={0} precision={2} style={{ width: 220 }} prefix="R$" />
                          </Form.Item>
                          <Form.Item
                            name="stock"
                            label="库存"
                            rules={[{ required: true, message: '请输入库存' }]}
                            style={{ flex: 1 }}
                          >
                            <InputNumber min={0} precision={0} style={{ width: 220 }} />
                          </Form.Item>
                        </Space>
                      </Form>
                      <Descriptions size="small" bordered column={1}>
                        <Descriptions.Item label="Shopee Item ID">
                          {editDetail?.itemId ||
                            (editingProduct ? getShopeeItemId(editingProduct) : '-') ||
                            '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="分类 ID">
                          {editDetail?.category?.categoryId || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="分类名称">
                          {editDetail?.category?.name || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="品牌">
                          {stringifyValue(editDetail?.brand)}
                        </Descriptions.Item>
                        <Descriptions.Item label="重量">
                          {editDetail?.package?.weight ?? '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="尺寸">
                          {stringifyValue(editDetail?.package?.dimension)}
                        </Descriptions.Item>
                        <Descriptions.Item label="状态">
                          {editDetail?.status || editingProduct?.status || '-'}
                        </Descriptions.Item>
                      </Descriptions>
                    </div>
                  ),
                },
                {
                  key: 'media',
                  label: '图片视频',
                  children: (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <div className="erp-media-grid">
                        {(editDetail?.images || []).map((image) => (
                          <Image
                            key={image.imageId || image.url}
                            width={96}
                            height={96}
                            src={image.url}
                            style={{ objectFit: 'cover', borderRadius: 4 }}
                          />
                        ))}
                        {!editDetail?.images?.length ? (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : null}
                      </div>
                      {renderRecordTable((editDetail?.videos || []).map((video) => asRecord(video)))}
                    </Space>
                  ),
                },
                {
                  key: 'attributes',
                  label: '分类属性',
                  children: renderRecordTable(editDetail?.attributes),
                },
                {
                  key: 'logistics-tax',
                  label: '物流税务',
                  children: (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <Typography.Title level={5}>物流</Typography.Title>
                      {renderRecordTable(editDetail?.logistics)}
                      <Typography.Title level={5}>税务</Typography.Title>
                      {renderDescriptions(editDetail?.tax)}
                    </Space>
                  ),
                },
                {
                  key: 'models',
                  label: 'SKU与原始数据',
                  children: (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <Typography.Title level={5}>Shopee Models</Typography.Title>
                      {renderRecordTable(editDetail?.models)}
                      <Typography.Title level={5}>本地 SKU</Typography.Title>
                      {renderRecordTable(editDetail?.skus)}
                      <Typography.Title level={5}>Shopee 原始返回</Typography.Title>
                      <Typography.Paragraph copyable>
                        <pre className="erp-raw-json">
                          {JSON.stringify(editDetail?.raw || {}, null, 2)}
                        </pre>
                      </Typography.Paragraph>
                    </Space>
                  ),
                },
              ]}
            />
          </Spin>
        </Modal>
        <Modal
          title="编辑在线商品"
          open={false}
          confirmLoading={editSubmitting}
          onOk={submitEdit}
          onCancel={() => setEditingProduct(undefined)}
          destroyOnClose
        >
          <Form form={editForm} layout="vertical" preserve={false}>
            <Form.Item name="shopId" label="店铺" rules={[{ required: true }]}>
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="title"
              label="商品标题"
              rules={[{ required: true, message: '请输入商品标题' }]}
            >
              <Input maxLength={120} showCount />
            </Form.Item>
            <Form.Item name="description" label="商品描述">
              <Input.TextArea rows={5} maxLength={3000} showCount />
            </Form.Item>
            <Form.Item
              name="price"
              label="价格"
              rules={[{ required: true, message: '请输入价格' }]}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="R$" />
            </Form.Item>
            <Form.Item
              name="stock"
              label="库存"
              rules={[{ required: true, message: '请输入库存' }]}
            >
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
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
            onClick={syncRemote}
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
