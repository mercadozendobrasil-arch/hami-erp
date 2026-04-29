import { ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import {
  PageContainer,
  type ProColumns,
  ProDescriptions,
  ProTable,
} from '@ant-design/pro-components';
import { useMutation, useQuery } from '@tanstack/react-query';
import { history, useLocation, useParams } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Empty,
  message,
  Row,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import {
  getOrderDetail,
  getOrderEscrow,
  syncOrderDetailNow,
} from '@/services/erp/order';
import {
  formatBrazilAddress,
  formatBrazilCurrency,
  formatBrazilPhone,
  formatBrazilTaxId,
} from '../utils/br';
import './style.less';

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

function statusTag(value?: string) {
  if (!value) return <Tag>-</Tag>;
  return (
    <Tag color={orderStatusColor[value] || 'default'}>
      {orderStatusLabel[value] || value}
    </Tag>
  );
}

const exceptionStatusLabel: Record<string, string> = {
  OPEN: '待处理',
  MANUAL_REVIEW: '人工处理中',
  RECHECKING: '重新校验中',
  IGNORED: '已忽略',
  RESOLVED: '已解决',
};

const exceptionStatusColor: Record<string, string> = {
  OPEN: 'error',
  MANUAL_REVIEW: 'warning',
  RECHECKING: 'processing',
  IGNORED: 'default',
  RESOLVED: 'success',
};

const severityColor: Record<string, string> = {
  LOW: 'green',
  MEDIUM: 'gold',
  HIGH: 'orange',
  CRITICAL: 'red',
};

function exceptionStatusTag(value?: string) {
  if (!value) return <Tag color="success">无异常</Tag>;
  return (
    <Tag color={exceptionStatusColor[value] || 'default'}>
      {exceptionStatusLabel[value] || value}
    </Tag>
  );
}

const itemColumns: ProColumns<ERP.OrderItemSku>[] = [
  {
    title: '商品',
    dataIndex: 'skuName',
    render: (_, record) => (
      <Space>
        {record.image ? (
          <img
            className="erp-detail-thumb"
            src={record.image}
            alt={record.skuName}
          />
        ) : (
          <div className="erp-detail-thumb empty" />
        )}
        <Space direction="vertical" size={2}>
          <Typography.Text>{record.skuName || '-'}</Typography.Text>
          <Typography.Text type="secondary">
            SKU: {record.skuId || '-'}
          </Typography.Text>
          <Space size={4} wrap>
            {(record.attributes || []).map((item) => (
              <Tag key={item}>{item}</Tag>
            ))}
          </Space>
        </Space>
      </Space>
    ),
  },
  { title: '数量', dataIndex: 'quantity', width: 90 },
  {
    title: '单价',
    dataIndex: 'unitPrice',
    width: 120,
    renderText: (value) => formatBrazilCurrency(value, 'BRL'),
  },
];

const OrderDetailPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const shopId = useMemo(
    () => new URLSearchParams(location.search).get('shopId') || undefined,
    [location.search],
  );
  const [messageApi, contextHolder] = message.useMessage();

  const detailQuery = useQuery({
    queryKey: ['erp-order-detail', params.id, shopId],
    enabled: Boolean(params.id && shopId),
    queryFn: async () => {
      try {
        return await getOrderDetail(params.id || '', shopId);
      } catch (error) {
        messageApi.error('订单详情请求失败');
        throw error;
      }
    },
  });

  const data = detailQuery.data as
    | (ERP.OrderDetail & Record<string, any>)
    | undefined;

  const escrowQuery = useQuery({
    queryKey: ['erp-order-escrow', data?.orderSn, shopId],
    enabled: Boolean(data?.orderSn && shopId),
    queryFn: async () => {
      try {
        const response = await getOrderEscrow(
          data?.orderSn || '',
          shopId || '',
        );
        return response.data;
      } catch (error) {
        messageApi.error('Escrow 请求失败');
        throw error;
      }
    },
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      syncOrderDetailNow({
        orderId: params.id,
        orderNo: data?.orderNo,
        orderSn: data?.orderSn,
        shopId: data?.platformShopId || shopId,
      }),
    onSuccess: async () => {
      messageApi.success('已触发同步');
      await detailQuery.refetch();
    },
    onError: () => messageApi.error('同步失败'),
  });

  if (!shopId) {
    return (
      <PageContainer title="订单详情">
        {contextHolder}
        <Empty description="请先选择店铺" style={{ paddingTop: 120 }}>
          <Button type="primary" onClick={() => history.push('/shop/list')}>
            返回店铺列表
          </Button>
        </Empty>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      className="erp-order-detail"
      title="订单详情"
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={detailQuery.isFetching}
          onClick={() => detailQuery.refetch()}
        >
          刷新
        </Button>,
        <Button
          key="sync"
          type="primary"
          icon={<SyncOutlined />}
          loading={syncMutation.isPending}
          disabled={!data}
          onClick={() => syncMutation.mutate()}
        >
          同步
        </Button>,
      ]}
    >
      {contextHolder}
      {!data ? (
        <Card loading={detailQuery.isFetching}>
          <Empty description="暂无订单详情" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="基础信息">
              <ProDescriptions<ERP.OrderDetail>
                column={4}
                dataSource={data}
                columns={[
                  { title: '订单号', dataIndex: 'orderNo', copyable: true },
                  {
                    title: '平台订单号',
                    dataIndex: 'platformOrderNo',
                    copyable: true,
                  },
                  {
                    title: '订单状态',
                    render: (_, record) => statusTag(record.orderStatus),
                  },
                  { title: '店铺', dataIndex: 'shopName' },
                  { title: '平台', dataIndex: 'platform' },
                  { title: '站点', dataIndex: 'platformRegion' },
                  {
                    title: '下单时间',
                    render: (_, record) =>
                      formatTime(record.orderTime || record.createTime),
                  },
                  {
                    title: '更新时间',
                    render: (_, record) => formatTime(record.updateTime),
                  },
                ]}
              />
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="异常处理">
              {data.latestException ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Space wrap>
                    {exceptionStatusTag(data.latestException.status)}
                    <Tag color={severityColor[data.latestException.severity] || 'default'}>
                      {data.latestException.severity}
                    </Tag>
                    <Tag>{data.latestException.exceptionType}</Tag>
                    <Tag color="blue">{data.latestException.source}</Tag>
                  </Space>
                  <Typography.Paragraph style={{ marginBottom: 0 }}>
                    {data.latestException.message || '暂无异常说明'}
                  </Typography.Paragraph>
                  <Typography.Text type="secondary">
                    发现时间：{formatTime(data.latestException.createdAt)}
                  </Typography.Text>
                  {data.latestException.resolvedAt ? (
                    <Typography.Text type="secondary">
                      解决时间：{formatTime(data.latestException.resolvedAt)}
                    </Typography.Text>
                  ) : null}
                </Space>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="当前没有活跃异常"
                />
              )}
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="履约阶段历史">
              {data.stageHistory?.length ? (
                <Timeline
                  items={data.stageHistory.map((item) => ({
                    color: item.toStage === data.fulfillmentStage ? 'blue' : 'gray',
                    children: (
                      <Space direction="vertical" size={2}>
                        <Typography.Text strong>
                          {item.fromStage || '新建'} → {item.toStage}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {item.trigger}
                          {item.action ? ` / ${item.action}` : ''}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {formatTime(item.createdAt)}
                        </Typography.Text>
                      </Space>
                    ),
                  }))}
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无阶段流转记录"
                />
              )}
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="买家信息">
              <ProDescriptions<ERP.OrderDetail>
                column={1}
                dataSource={data}
                columns={[
                  { title: '买家', dataIndex: 'buyerName' },
                  { title: '买家 ID', dataIndex: 'buyerUserId' },
                  {
                    title: '收件人',
                    dataIndex: ['addressInfo', 'receiverName'],
                  },
                  {
                    title: '电话',
                    render: (_, record) =>
                      formatBrazilPhone(record.addressInfo?.receiverPhone),
                  },
                  {
                    title: '城市/州',
                    render: (_, record) =>
                      [record.addressInfo?.city, record.addressInfo?.state]
                        .filter(Boolean)
                        .join(', ') || '-',
                  },
                  {
                    title: 'CPF/CNPJ',
                    render: (_, record) =>
                      formatBrazilTaxId(
                        record.addressInfo?.recipientTaxId ||
                          record.buyerCpfId ||
                          record.buyerCnpjId,
                      ),
                  },
                  {
                    title: '完整地址',
                    render: (_, record) =>
                      record.addressInfo
                        ? formatBrazilAddress(record.addressInfo)
                        : '-',
                  },
                ]}
              />
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="金额">
              <ProDescriptions<ERP.OrderDetail>
                column={1}
                dataSource={data}
                columns={[
                  {
                    title: '订单金额',
                    render: (_, record) =>
                      formatBrazilCurrency(
                        record.totalAmount,
                        record.currency || 'BRL',
                      ),
                  },
                  { title: '支付方式', dataIndex: 'paymentMethod' },
                  {
                    title: '支付金额',
                    render: (_, record) =>
                      formatBrazilCurrency(
                        record.paymentInfo?.payAmount || record.totalAmount,
                        record.currency || 'BRL',
                      ),
                  },
                  {
                    title: '预估运费',
                    render: (_, record) =>
                      formatBrazilCurrency(record.estimatedShippingFee, 'BRL'),
                  },
                  {
                    title: '实际运费',
                    render: (_, record) =>
                      formatBrazilCurrency(record.actualShippingFee, 'BRL'),
                  },
                  {
                    title: '逆向运费',
                    render: (_, record) =>
                      formatBrazilCurrency(record.reverseShippingFee, 'BRL'),
                  },
                ]}
              />
            </Card>
          </Col>

          <Col span={24}>
            <Card title="商品明细">
              <ProTable<ERP.OrderItemSku>
                rowKey={(record) => record.skuId || record.skuName}
                search={false}
                options={false}
                pagination={false}
                columns={itemColumns}
                dataSource={data.itemList || []}
              />
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="物流">
              <ProDescriptions<ERP.OrderDetail>
                column={1}
                dataSource={data}
                columns={[
                  {
                    title: '物流方式',
                    render: (_, record) =>
                      record.shippingCarrier ||
                      record.checkoutShippingCarrier ||
                      record.logisticsCompany ||
                      '-',
                  },
                  {
                    title: '物流状态',
                    dataIndex: 'logisticsStatus',
                    render: (_, record) => (
                      <Tag>{record.logisticsStatus || '-'}</Tag>
                    ),
                  },
                  {
                    title: '包裹号',
                    dataIndex: 'packageNumber',
                    copyable: true,
                  },
                  { title: '运单号', dataIndex: 'trackingNo', copyable: true },
                  {
                    title: '最晚发货',
                    render: (_, record) => formatTime(record.shipByDate),
                  },
                  { title: '仓库', dataIndex: 'warehouseName' },
                ]}
              />
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="Escrow" loading={escrowQuery.isFetching}>
              <pre className="erp-json-block">
                {JSON.stringify(escrowQuery.data || {}, null, 2)}
              </pre>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="rawData">
              <pre className="erp-json-block">
                {JSON.stringify(
                  data.rawData || data.raw || data.sourceRaw || data,
                  null,
                  2,
                )}
              </pre>
            </Card>
          </Col>
        </Row>
      )}
    </PageContainer>
  );
};

export default OrderDetailPage;
