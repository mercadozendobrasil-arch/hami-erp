import {
  LinkOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { history, useLocation } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Input,
  message,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  bindSkuMapping,
  queryErpSkus,
  queryMissingSkuMappings,
} from '@/services/erp/product';
import { queryShops } from '@/services/erp/shop';
import '../list/style.less';
import './style.less';

const MappingPage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const actionRef = useRef<ActionType | null>(null);
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const [shopId, setShopId] = useState<string | undefined>(
    searchParams.get('shopId') || undefined,
  );
  const [keyword, setKeyword] = useState<string>();
  const [skuKeyword, setSkuKeyword] = useState<string>();
  const [bindingRecord, setBindingRecord] =
    useState<ERP.MissingSkuMappingItem>();
  const [selectedSkuId, setSelectedSkuId] = useState<string>();
  const [binding, setBinding] = useState(false);

  const { data: shopsResponse } = useQuery({
    queryKey: ['sku-mapping-shops'],
    queryFn: () => queryShops({ current: 1, pageSize: 100 }),
  });

  const { data: skusResponse, isFetching: loadingSkus } = useQuery({
    queryKey: ['erp-skus', shopId, skuKeyword],
    queryFn: async () => {
      try {
        return await queryErpSkus({
          current: 1,
          pageSize: 50,
          shopId,
          keyword: skuKeyword,
        });
      } catch {
        return { success: true, data: [], total: 0 };
      }
    },
    enabled: Boolean(shopId && bindingRecord),
  });

  const shopOptions = useMemo(
    () =>
      (shopsResponse?.data || []).map((shop) => ({
        label: shop.shopName,
        value: shop.shopId,
      })),
    [shopsResponse?.data],
  );

  const skuOptions = useMemo(
    () =>
      (skusResponse?.data || []).map((sku) => ({
        label: `${sku.skuCode} · ${sku.productTitle}`,
        value: sku.skuId,
        sku,
      })),
    [skusResponse?.data],
  );

  useEffect(() => {
    const firstShopId = shopOptions[0]?.value;
    if (shopId || !firstShopId) {
      return;
    }

    setShopId(firstShopId);
    const search = new URLSearchParams(location.search);
    search.set('shopId', firstShopId);
    history.replace(`${location.pathname}?${search.toString()}`);
  }, [location.pathname, location.search, shopId, shopOptions]);

  const submitBinding = async () => {
    if (!bindingRecord || !selectedSkuId) {
      messageApi.warning('请选择要绑定的本地 SKU');
      return;
    }

    setBinding(true);
    try {
      await bindSkuMapping({
        shopId: bindingRecord.shopId,
        itemId: bindingRecord.itemId,
        modelId: bindingRecord.modelId,
        platformSkuId: bindingRecord.platformSkuId,
        skuCode: bindingRecord.platformSkuCode,
        skuId: selectedSkuId,
      });
      messageApi.success('SKU 映射已绑定');
      setBindingRecord(undefined);
      setSelectedSkuId(undefined);
      actionRef.current?.reload();
    } catch {
      messageApi.error('绑定失败，请稍后重试');
    } finally {
      setBinding(false);
    }
  };

  const columns: ProColumns<ERP.MissingSkuMappingItem>[] = [
    {
      title: '平台商品',
      dataIndex: 'itemName',
      width: 300,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong ellipsis style={{ maxWidth: 280 }}>
            {record.itemName || '-'}
          </Typography.Text>
          <Typography.Text type="secondary" copyable>
            Item ID: {record.itemId}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '平台 SKU',
      dataIndex: 'platformSkuCode',
      width: 230,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>{record.platformSkuCode || '-'}</Typography.Text>
          <Typography.Text type="secondary">
            {record.modelName || record.modelId || '-'}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '来源订单',
      dataIndex: 'orderSn',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Link copyable>{record.orderSn}</Typography.Link>
          <Typography.Text type="secondary">
            {record.buyerUsername || '-'}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '店铺',
      dataIndex: 'shopId',
      width: 150,
      renderText: (value) => value || '-',
    },
    {
      title: '累计数量',
      dataIndex: 'quantity',
      width: 100,
      align: 'right',
      renderText: (value) => value ?? 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: () => <Tag color="warning">待映射</Tag>,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          icon={<LinkOutlined />}
          onClick={() => {
            setBindingRecord(record);
            setSelectedSkuId(undefined);
          }}
        >
          绑定
        </Button>
      ),
    },
  ];

  return (
    <div className="erp-product-page erp-sku-mapping-page">
      {contextHolder}
      <div className="erp-content">
        <Alert
          showIcon
          type="info"
          message="SKU 映射队列"
          description="这里汇总订单中出现但尚未绑定到本地商品 SKU 的 Shopee 商品/规格。绑定后，后续库存、利润、采购和异常订单才能按本地 SKU 聚合。"
          className="erp-sku-mapping-alert"
        />

        <div className="erp-filterbar">
          <Select
            allowClear
            placeholder="全部店铺"
            value={shopId}
            options={shopOptions}
            style={{ width: 220 }}
            onChange={(value) => {
              setShopId(value);
              const search = new URLSearchParams(location.search);
              if (value) {
                search.set('shopId', value);
              } else {
                search.delete('shopId');
              }
              history.replace(`${location.pathname}?${search.toString()}`);
              actionRef.current?.reload();
            }}
          />
          <Input.Search
            allowClear
            placeholder="搜索商品名 / Item ID / SKU"
            style={{ width: 360 }}
            enterButton={<SearchOutlined />}
            onSearch={(value) => {
              setKeyword(value || undefined);
              actionRef.current?.reload();
            }}
          />
          <div className="erp-toolbar-spacer" />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            刷新
          </Button>
        </div>

        <ProTable<ERP.MissingSkuMappingItem, ERP.SkuMappingQueryParams>
          rowKey={(record) =>
            `${record.shopId}:${record.itemId}:${record.modelId || record.platformSkuCode || record.orderSn}`
          }
          actionRef={actionRef}
          className="erp-dense-table"
          search={false}
          columns={columns}
          scroll={{ x: 1240 }}
          request={async (params) => {
            if (!shopId) {
              return { success: true, data: [], total: 0 };
            }

            try {
              const response = await queryMissingSkuMappings({
                ...params,
                shopId,
              });
              const data = keyword
                ? response.data.filter((item) => {
                    const text = [
                      item.itemName,
                      item.itemId,
                      item.modelName,
                      item.modelId,
                      item.platformSkuCode,
                      item.orderSn,
                    ]
                      .filter(Boolean)
                      .join(' ')
                      .toLowerCase();
                    return text.includes(keyword.toLowerCase());
                  })
                : response.data;
              return { ...response, data, total: keyword ? data.length : response.total };
            } catch {
              messageApi.error('SKU 映射队列请求失败');
              return { success: false, data: [], total: 0 };
            }
          }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          locale={{ emptyText: '暂无待映射 SKU' }}
        />
      </div>

      <Modal
        title="绑定本地 SKU"
        open={Boolean(bindingRecord)}
        confirmLoading={binding}
        onOk={submitBinding}
        onCancel={() => {
          setBindingRecord(undefined);
          setSelectedSkuId(undefined);
        }}
        okText="确认绑定"
        destroyOnClose
      >
        {bindingRecord ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="平台商品">
                {bindingRecord.itemName || bindingRecord.itemId}
              </Descriptions.Item>
              <Descriptions.Item label="平台 SKU">
                {bindingRecord.platformSkuCode ||
                  bindingRecord.modelName ||
                  bindingRecord.modelId ||
                  '-'}
              </Descriptions.Item>
              <Descriptions.Item label="来源订单">
                {bindingRecord.orderSn}
              </Descriptions.Item>
            </Descriptions>
            <Select
              showSearch
              value={selectedSkuId}
              loading={loadingSkus}
              placeholder="搜索并选择本地 SKU"
              filterOption={false}
              options={skuOptions}
              style={{ width: '100%' }}
              onSearch={(value) => setSkuKeyword(value || undefined)}
              onChange={(value) => setSelectedSkuId(value)}
            />
          </Space>
        ) : null}
      </Modal>
    </div>
  );
};

export default MappingPage;
