import { useMutation, useQuery } from '@tanstack/react-query';
import {
  PageContainer,
  ProDescriptions,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useParams } from '@umijs/max';
import { Alert, Button, Card, Col, Empty, Modal, Row, Space, Tag, Timeline, Typography, message } from 'antd';
import React from 'react';
import {
  getOrderDetail,
  getShopeeShippingParameter,
  getShippingDocumentDownloadUrl,
  queryShopeeSyncLogs,
  syncShopeeTrackingNumber,
  syncOrderDetailNow,
} from '@/services/erp/order';
import {
  AFTER_SALE_STATUS_OPTIONS,
  AUDIT_STATUS_OPTIONS,
  LOGISTICS_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
  PACKAGE_FULFILLMENT_STATUS_OPTIONS,
  PACKAGE_STATUS_OPTIONS,
  PAY_STATUS_OPTIONS,
  SHOPEE_PLATFORM_STATUS_OPTIONS,
  renderExceptionTags,
  renderStatusTag,
} from '../constants';
import OrderActionModals from '../components/OrderActionModals';
import { getOrderActionPolicies } from '../utils/actionPolicy';
import {
  formatBrazilAddress,
  formatBrazilCurrency,
  formatBrazilPhone,
  formatBrazilPostalCode,
  formatBrazilTaxId,
} from '../utils/br';

const DATA_SOURCE_OPTIONS: Record<ERP.ShopeeDataSource, { text: string; color: string }> = {
  REALTIME_SYNCED: { text: '真实同步', color: 'success' },
  DB_RAW_JSON: { text: '历史 raw_json', color: 'processing' },
  FALLBACK: { text: 'fallback', color: 'default' },
};

const SYNC_RESULT_OPTIONS: Record<NonNullable<ERP.OrderSyncMeta['lastResult']>, { text: string; color: string }> = {
  success: { text: '成功', color: 'success' },
  partial: { text: '部分回流', color: 'warning' },
  failed: { text: '失败', color: 'error' },
};

const SYNC_TRIGGER_OPTIONS: Record<NonNullable<ERP.OrderSyncMeta['lastTriggerType']>, string> = {
  manual_detail: '手动详情同步',
  manual_status: '手动状态同步',
  sync_recent: '最近订单补详情',
  webhook: 'Webhook 回流',
  invoice_add: '补发票信息',
  shipping_parameter: '单单发货预检',
  shipping_parameter_mass: 'Mass 发货预检',
  ship: '单单发货',
  ship_batch: 'Batch 发货',
  ship_mass: 'Mass 发货',
  tracking_sync: '单单补拉运单',
  tracking_sync_mass: 'Mass 补拉运单',
  shipping_update: '更新发货信息',
};

function renderSourceTag(value: ERP.ShopeeDataSource) {
  const config = DATA_SOURCE_OPTIONS[value];
  return <Tag color={config.color}>{config.text}</Tag>;
}

function renderSyncResultTag(value?: ERP.OrderSyncMeta['lastResult']) {
  if (!value) {
    return <Tag>未知</Tag>;
  }
  const config = SYNC_RESULT_OPTIONS[value];
  return <Tag color={config.color}>{config.text}</Tag>;
}

function renderSyncTriggerTag(value?: ERP.OrderSyncMeta['lastTriggerType']) {
  if (!value) {
    return <Tag>未知来源</Tag>;
  }
  return <Tag color="blue">{SYNC_TRIGGER_OPTIONS[value]}</Tag>;
}

function renderFieldSourceTag(isRealField: boolean) {
  return isRealField ? <Tag color="success">真实字段</Tag> : <Tag>fallback</Tag>;
}

const skuColumns: ProColumns<ERP.OrderItemSku>[] = [
  { title: 'SKU', dataIndex: 'skuId', width: 140 },
  { title: '商品名', dataIndex: 'skuName' },
  {
    title: '属性',
    dataIndex: 'attributes',
    render: (_, record) => record.attributes.map((item) => <Tag key={item}>{item}</Tag>),
  },
  { title: '数量', dataIndex: 'quantity', width: 80 },
  {
    title: '单价',
    dataIndex: 'unitPrice',
    width: 120,
    renderText: (value) => `BRL ${value}`,
  },
];

const packageColumns: ProColumns<ERP.ShopeePackageInfo>[] = [
  { title: '包裹号', dataIndex: 'packageNumber', width: 180, copyable: true },
  {
    title: '包裹状态',
    dataIndex: 'packageStatus',
    width: 120,
    render: (_, record) => (
      <Space wrap size={4}>
        {renderStatusTag(record.packageStatus, PACKAGE_STATUS_OPTIONS)}
        {renderFieldSourceTag(
          record.realFieldList.includes('package_status') ||
            record.realFieldList.includes('fulfillment_status'),
        )}
      </Space>
    ),
  },
  {
    title: '包裹履约状态',
    dataIndex: 'fulfillmentStatus',
    width: 150,
    render: (_, record) =>
      renderStatusTag(record.packageFulfillmentStatus, PACKAGE_FULFILLMENT_STATUS_OPTIONS),
  },
  {
    title: '物流状态',
    dataIndex: 'logisticsStatus',
    width: 160,
    render: (_, record) => (
      <Space wrap size={4}>
        {renderStatusTag(record.logisticsStatus, LOGISTICS_STATUS_OPTIONS)}
        {renderFieldSourceTag(record.realFieldList.includes('logistics_status'))}
      </Space>
    ),
  },
  {
    title: '物流商',
    dataIndex: 'shippingCarrier',
    width: 160,
    render: (_, record) => (
      <Space wrap size={4}>
        <Typography.Text>{record.shippingCarrier || '-'}</Typography.Text>
        {renderFieldSourceTag(record.realFieldList.includes('shipping_carrier'))}
      </Space>
    ),
  },
  {
    title: '物流渠道',
    dataIndex: 'logisticsChannelName',
    width: 180,
    render: (_, record) => record.logisticsChannelName || `ID ${record.logisticsChannelId || '-'}`,
  },
  {
    title: '物流模式',
    dataIndex: 'logisticsProfile',
    width: 140,
    render: (_, record) => {
      if (record.logisticsProfile === 'SHOPEE_XPRESS') return <Tag color="blue">Shopee Xpress</Tag>;
      if (record.logisticsProfile === 'DIRECT_DELIVERY') return <Tag color="gold">Entrega Direta</Tag>;
      return <Tag>其他渠道</Tag>;
    },
  },
  {
    title: 'service_code',
    dataIndex: 'serviceCode',
    width: 140,
    renderText: (value) => value || '-',
  },
  {
    title: '运单号',
    dataIndex: 'trackingNumber',
    width: 180,
    render: (_, record) => (
      <Space wrap size={4}>
        <Typography.Text>{record.trackingNumber || '-'}</Typography.Text>
        {renderFieldSourceTag(record.realFieldList.includes('tracking_number'))}
      </Space>
    ),
  },
  {
    title: '面单状态',
    dataIndex: 'shippingDocumentStatus',
    width: 140,
    renderText: (value) => value || '-',
  },
  {
    title: '面单类型',
    dataIndex: 'shippingDocumentType',
    width: 160,
    renderText: (value) => value || '-',
  },
  {
    title: '面单同步时间',
    dataIndex: 'lastDocumentSyncTime',
    width: 180,
    renderText: (value) => value || '-',
  },
  {
    title: '面单文件',
    dataIndex: 'documentUrl',
    width: 160,
    render: (_, record) =>
      record.documentUrl || record.downloadRef ? (
        <a
          href={getShippingDocumentDownloadUrl(
            record.packageNumber,
            record.shippingDocumentType,
          )}
          target="_blank"
          rel="noreferrer"
        >
          下载面单
        </a>
      ) : (
        '-'
      ),
  },
  { title: '包裹商品数', dataIndex: 'parcelItemCount', width: 100 },
  {
    title: '数据来源',
    dataIndex: 'dataSource',
    width: 120,
    render: (_, record) => renderSourceTag(record.dataSource),
  },
  {
    title: '包裹更新时间',
    dataIndex: 'latestPackageUpdateTime',
    width: 180,
    renderText: (value) => value || '-',
  },
  { title: '最晚出货时间', dataIndex: 'shipByDate', width: 180 },
];

const paymentColumns: ProColumns<ERP.ShopeePaymentInfo>[] = [
  { title: '支付方式', dataIndex: 'paymentMethod', width: 120 },
  { title: '支付处理机构', dataIndex: 'paymentProcessorRegister', width: 180 },
  { title: '卡组织', dataIndex: 'cardBrand', width: 120, renderText: (value) => value || '-' },
  { title: '授权流水', dataIndex: 'transactionId', width: 160 },
  {
    title: '支付金额',
    dataIndex: 'paymentAmount',
    width: 140,
    renderText: (value) => formatBrazilCurrency(value, 'BRL'),
  },
];

const OrderDetailPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['order-detail', params.id],
    queryFn: () => getOrderDetail(params.id || ''),
  });
  const latestSyncLogQuery = useQuery({
    queryKey: ['order-sync-log-latest', params.id, data?.orderNo, data?.orderSn],
    enabled: Boolean(data?.orderNo || data?.orderSn),
    queryFn: async () => {
      const response = await queryShopeeSyncLogs({
        current: 1,
        pageSize: 1,
        orderNo: data?.orderNo,
        orderSn: data?.orderSn,
      });
      return response.data?.[0];
    },
  });
  const syncMutation = useMutation({
    mutationFn: () =>
      syncOrderDetailNow({
        orderId: params.id,
        orderNo: data?.orderNo,
      }),
    onSuccess: async () => {
      messageApi.success('已触发真实订单详情同步');
      await refetch();
    },
    onError: () => {
      messageApi.error('订单详情同步失败');
    },
  });
  const trackingMutation = useMutation({
    mutationFn: async () => {
      if (!data?.packageNumber) {
        throw new Error('当前订单缺少 packageNumber');
      }
      return syncShopeeTrackingNumber({
        shopId: data.platformShopId,
        orderId: params.id,
        orderSn: data.orderSn,
        packageNumber: data.packageNumber,
        responseOptionalFields: 'plp_number,first_mile_tracking_number,last_mile_tracking_number',
      });
    },
    onSuccess: async () => {
      messageApi.success('已主动补拉 tracking');
      await refetch();
    },
    onError: (error) => {
      messageApi.error(error instanceof Error ? error.message : '补拉 tracking 失败');
    },
  });
  const detailActions = data
    ? getOrderActionPolicies({
        orders: [data],
      })
    : [];

  return (
    <PageContainer
      title="订单详情"
      subTitle="按 Shopee 订单、包裹、物流、取消/退货语义展示详情。"
      extra={[
        data ? (
          <OrderActionModals
            key="invoice-action"
            currentOrder={data}
            allowedActions={detailActions}
            visibleActionKeys={['invoice']}
            onSuccess={() => {
              refetch();
            }}
          />
        ) : null,
        <Button
          key="shipping-parameter"
          onClick={async () => {
            if (!data?.packageNumber) {
              messageApi.warning('当前订单没有 packageNumber');
              return;
            }
            const response = await getShopeeShippingParameter({
              shopId: data.platformShopId,
              orderId: params.id,
              orderSn: data.orderSn,
              packageNumber: data.packageNumber,
            });
            Modal.info({
              title: `发货前参数校验: ${data.packageNumber}`,
              width: 860,
              content: (
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </Typography.Paragraph>
              ),
            });
          }}
        >
          查看发货参数
        </Button>,
        <Button
          key="tracking-sync"
          loading={trackingMutation.isPending}
          onClick={() => trackingMutation.mutate()}
        >
          补拉运单
        </Button>,
        <Button
          key="sync-detail"
          loading={syncMutation.isPending || isFetching}
          onClick={() => syncMutation.mutate()}
        >
          手动同步详情
        </Button>,
      ]}
    >
      {contextHolder}
      {!data ? (
        <Card>
          <Empty description="未获取到订单详情" />
        </Card>
      ) : (
        <>
          {data.orderStatus === 'PENDING_INVOICE' ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="当前 Shopee 状态为 PENDING_INVOICE"
              description="巴西站订单在补齐发票信息前不会进入 READY_TO_SHIP。请先提交发票号码、访问键和开票金额，再刷新订单详情。"
            />
          ) : null}
          <Alert
            type={data.branchReason ? 'warning' : 'info'}
            showIcon
            style={{ marginBottom: 16 }}
            message={
              data.branchReason
                ? `当前处于 ${ORDER_STATUS_OPTIONS[data.orderStatus].text} 分支`
                : `当前处于 ${ORDER_STATUS_OPTIONS[data.orderStatus].text} 主链路`
            }
            description={`${data.fulfillmentStageDescription} 当前建议动作：${data.nextActionSuggestion}`}
          />

          <ProDescriptions<ERP.OrderDetail>
            column={2}
            dataSource={data}
            columns={[
              { title: '订单号', dataIndex: 'orderSn', copyable: true },
              { title: '平台单号', dataIndex: 'platformOrderNo', copyable: true },
              {
                title: 'Shopee 主状态',
                dataIndex: 'orderStatus',
                render: (_, record) => renderStatusTag(record.orderStatus, ORDER_STATUS_OPTIONS),
              },
              {
                title: '平台状态',
                dataIndex: 'platformStatus',
                render: (_, record) =>
                  renderStatusTag(record.platformStatus, SHOPEE_PLATFORM_STATUS_OPTIONS),
              },
              { title: '店铺', dataIndex: 'shopName' },
              { title: '站点', dataIndex: 'platformRegion' },
              { title: '买家', dataIndex: 'buyerName' },
              { title: '买家 ID', dataIndex: 'buyerUserId' },
              { title: '下单时间', dataIndex: 'createTime' },
              { title: '更新时间', dataIndex: 'updateTime' },
              { title: '最近同步时间', dataIndex: 'lastSyncTime', renderText: (value) => value || '-' },
              {
                title: '最近同步触发',
                render: (_, record) => renderSyncTriggerTag(record.syncMeta.lastTriggerType),
              },
              {
                title: '最近同步结果',
                render: (_, record) => renderSyncResultTag(record.syncMeta.lastResult),
              },
              {
                title: '数据来源',
                render: (_, record) => (
                  <Space wrap>
                    {renderSourceTag(record.syncMeta.detailSource)}
                    {renderSourceTag(record.syncMeta.packageSource)}
                    {renderSyncTriggerTag(record.syncMeta.lastTriggerType)}
                    {renderSyncResultTag(record.syncMeta.lastResult)}
                  </Space>
                ),
              },
              { title: '最晚出货时间', dataIndex: 'shipByDate' },
              { title: '备货时效(天)', dataIndex: 'daysToShip' },
              {
                title: '订单金额',
                dataIndex: 'totalAmount',
                renderText: (value, record) => formatBrazilCurrency(value, record.currency),
              },
              { title: '支付方式', dataIndex: 'paymentMethod' },
              { title: '物流商', dataIndex: 'shippingCarrier', renderText: (value) => value || '-' },
              { title: '物流渠道', dataIndex: 'checkoutShippingCarrier', renderText: (value) => value || '-' },
              {
                title: '支付状态',
                dataIndex: 'payStatus',
                render: (_, record) => renderStatusTag(record.payStatus, PAY_STATUS_OPTIONS),
              },
              {
                title: '内部审核状态',
                dataIndex: 'auditStatus',
                render: (_, record) => renderStatusTag(record.auditStatus, AUDIT_STATUS_OPTIONS),
              },
              {
                title: '包裹状态',
                dataIndex: 'packageStatus',
                render: (_, record) => renderStatusTag(record.packageStatus, PACKAGE_STATUS_OPTIONS),
              },
              {
                title: '包裹履约状态',
                dataIndex: 'packageFulfillmentStatus',
                render: (_, record) =>
                  renderStatusTag(
                    record.packageFulfillmentStatus,
                    PACKAGE_FULFILLMENT_STATUS_OPTIONS,
                  ),
              },
              {
                title: '物流状态',
                dataIndex: 'logisticsStatus',
                render: (_, record) =>
                  renderStatusTag(record.logisticsStatus, LOGISTICS_STATUS_OPTIONS),
              },
              {
                title: '售后状态',
                dataIndex: 'afterSaleStatus',
                render: (_, record) =>
                  renderStatusTag(record.afterSaleStatus, AFTER_SALE_STATUS_OPTIONS),
              },
              { title: '包裹号', dataIndex: 'packageNumber', copyable: true },
              {
                title: '运单号',
                dataIndex: 'trackingNo',
                render: (_, record) => (
                  <Space wrap size={4}>
                    <Typography.Text>{record.trackingNo || '-'}</Typography.Text>
                    {renderFieldSourceTag(
                      record.packageList.some((item) => item.realFieldList.includes('tracking_number')),
                    )}
                  </Space>
                ),
              },
              { title: '履约方', dataIndex: 'fulfillmentFlag' },
              {
                title: 'CPF/CNPJ',
                render: (_, record) =>
                  formatBrazilTaxId(record.buyerCnpjId || record.buyerCpfId),
              },
              {
                title: '估算运费',
                dataIndex: 'estimatedShippingFee',
                renderText: (value) => formatBrazilCurrency(value, 'BRL'),
              },
              {
                title: '实际运费',
                dataIndex: 'actualShippingFee',
                renderText: (value) => formatBrazilCurrency(value, 'BRL'),
              },
              {
                title: '逆向运费',
                dataIndex: 'reverseShippingFee',
                renderText: (value) => formatBrazilCurrency(value, 'BRL'),
              },
              { title: '取消发起方', dataIndex: 'cancelBy', renderText: (value) => value || '-' },
              { title: '取消原因', dataIndex: 'cancelReason', renderText: (value) => value || '-' },
              { title: '买家取消原因', dataIndex: 'buyerCancelReason', renderText: (value) => value || '-' },
              {
                title: '需要补充的物流参数',
                dataIndex: 'infoNeeded',
                render: (_, record) =>
                  record.infoNeeded.length ? record.infoNeeded.join(', ') : '-',
              },
              {
                title: '异常标签',
                dataIndex: 'tags',
                span: 2,
                render: (_, record) => renderExceptionTags(record.tags),
              },
              {
                title: '留言/备注',
                span: 2,
                render: (_, record) => (
                  <Space direction="vertical" size={0}>
                    <Typography.Text>买家留言：{record.messageToSeller || '-'}</Typography.Text>
                    <Typography.Text>买家备注：{record.buyerNote || '-'}</Typography.Text>
                    <Typography.Text>卖家备注：{record.sellerNote || '-'}</Typography.Text>
                    <Typography.Text>ERP 备注：{record.remark || '-'}</Typography.Text>
                  </Space>
                ),
              },
            ]}
          />

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} xl={16}>
              <Card title="状态流转" style={{ marginBottom: 16 }}>
                <Timeline
                  items={data.statusTrail.map((status, index) => ({
                    color: index === data.statusTrail.length - 1 ? 'green' : 'blue',
                    children: renderStatusTag(status, ORDER_STATUS_OPTIONS),
                  }))}
                />
              </Card>

              <Card title="包裹信息" style={{ marginBottom: 16 }}>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="package 真实来源说明"
                  description={`包裹主来源：${DATA_SOURCE_OPTIONS[data.syncMeta.packageSource].text}。缺失字段：${
                    data.syncMeta.fallbackFields.length
                      ? data.syncMeta.fallbackFields.join(', ')
                      : '无'
                  }`}
                />
                {latestSyncLogQuery.data ? (
                  <Alert
                    type={latestSyncLogQuery.data.resultStatus === 'failed' ? 'error' : 'success'}
                    showIcon
                    style={{ marginBottom: 12 }}
                    message="最近同步日志摘要"
                    description={
                      <Space wrap>
                        <Typography.Text>
                          {SYNC_TRIGGER_OPTIONS[latestSyncLogQuery.data.triggerType]}
                        </Typography.Text>
                        {renderSyncResultTag(latestSyncLogQuery.data.resultStatus)}
                        <Typography.Text type="secondary">
                          {latestSyncLogQuery.data.createdAt}
                        </Typography.Text>
                        <Typography.Text>
                          {latestSyncLogQuery.data.message || '无附加消息'}
                        </Typography.Text>
                      </Space>
                    }
                  />
                ) : null}
                <ProTable<ERP.ShopeePackageInfo>
                  rowKey="packageNumber"
                  search={false}
                  options={false}
                  pagination={false}
                  columns={packageColumns}
                  dataSource={data.packageList}
                  expandable={{
                    expandedRowRender: (record) => (
                      <Space direction="vertical" size={4}>
                        <Typography.Text type="secondary">
                          真实字段：{record.realFieldList.length ? record.realFieldList.join(', ') : '无'}
                        </Typography.Text>
                        <Space wrap>
                          <Typography.Text>
                            运单来源：{renderFieldSourceTag(record.realFieldList.includes('tracking_number'))}
                          </Typography.Text>
                          <Typography.Text>
                            包裹状态来源：
                            {renderFieldSourceTag(
                              record.realFieldList.includes('package_status') ||
                                record.realFieldList.includes('fulfillment_status'),
                            )}
                          </Typography.Text>
                          <Typography.Text>
                            物流状态来源：
                            {renderFieldSourceTag(record.realFieldList.includes('logistics_status'))}
                          </Typography.Text>
                          <Typography.Text>
                            承运商来源：
                            {renderFieldSourceTag(record.realFieldList.includes('shipping_carrier'))}
                          </Typography.Text>
                        </Space>
                      </Space>
                    ),
                  }}
                />
              </Card>

              <Card title="商品信息" style={{ marginBottom: 16 }}>
                <ProTable<ERP.OrderItemSku>
                  rowKey="skuId"
                  search={false}
                  options={false}
                  pagination={false}
                  columns={skuColumns}
                  dataSource={data.itemList}
                />
              </Card>

              <Card title="支付信息" style={{ marginBottom: 16 }}>
                <ProDescriptions<ERP.OrderDetail>
                  column={2}
                  dataSource={data}
                  columns={[
                    { title: '支付摘要', dataIndex: ['paymentInfo', 'method'] },
                    { title: '支付时间', dataIndex: ['paymentInfo', 'paidAt'] },
                    { title: '交易流水', dataIndex: ['paymentInfo', 'transactionNo'] },
                    {
                      title: '支付金额',
                      dataIndex: ['paymentInfo', 'payAmount'],
                      renderText: (value, record) =>
                        formatBrazilCurrency(value, record.paymentInfo.currency),
                    },
                  ]}
                />
                <ProTable<ERP.ShopeePaymentInfo>
                  rowKey="transactionId"
                  search={false}
                  options={false}
                  pagination={false}
                  columns={paymentColumns}
                  dataSource={data.paymentInfoList}
                  style={{ marginTop: 16 }}
                />
              </Card>

              <Card title="操作日志">
                <Timeline
                  items={data.operationLogs.map((item) => ({
                    color: 'blue',
                    children: (
                      <Space direction="vertical" size={0}>
                        <Typography.Text strong>
                          {item.action} / {item.operator}
                        </Typography.Text>
                        <Typography.Text type="secondary">{item.createdAt}</Typography.Text>
                        <Typography.Text>{item.detail}</Typography.Text>
                      </Space>
                    ),
                  }))}
                />
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <Card title="买家与收件信息" style={{ marginBottom: 16 }}>
                <ProDescriptions<ERP.OrderDetail>
                  column={1}
                  dataSource={data}
                  columns={[
                    { title: '买家', dataIndex: 'buyerName' },
                    { title: '邮箱', dataIndex: 'buyerEmail' },
                    { title: '收件人', dataIndex: ['addressInfo', 'receiverName'] },
                    {
                      title: '手机号',
                      render: (_, record) => formatBrazilPhone(record.addressInfo.receiverPhone),
                    },
                    { title: '国家/站点', render: (_, record) => `${record.addressInfo.country} / ${record.platformRegion}` },
                    { title: '州', dataIndex: ['addressInfo', 'state'] },
                    { title: '城市', dataIndex: ['addressInfo', 'city'] },
                    { title: '区', dataIndex: ['addressInfo', 'district'] },
                    {
                      title: 'CEP',
                      render: (_, record) => formatBrazilPostalCode(record.addressInfo.zipCode),
                    },
                    {
                      title: 'CPF/CNPJ',
                      render: (_, record) =>
                        formatBrazilTaxId(
                          record.addressInfo.recipientTaxId ||
                            record.buyerCnpjId ||
                            record.buyerCpfId,
                        ),
                    },
                    {
                      title: '完整地址',
                      render: (_, record) => formatBrazilAddress(record.addressInfo),
                    },
                  ]}
                />
              </Card>

              <Card title="物流与仓配信息" style={{ marginBottom: 16 }}>
                <ProDescriptions<ERP.OrderDetail>
                  column={1}
                  dataSource={data}
	                  columns={[
	                    { title: '仓库', dataIndex: 'warehouseName' },
	                    { title: '推荐仓库', dataIndex: 'recommendedWarehouse' },
	                    { title: 'ERP 物流商', dataIndex: 'logisticsCompany' },
	                    { title: 'ERP 物流渠道', dataIndex: 'logisticsChannel' },
	                    {
	                      title: '物流模式',
	                      render: (_, record) => {
	                        if (record.logisticsInfo.logisticsProfile === 'SHOPEE_XPRESS') {
	                          return 'Shopee Xpress';
	                        }
	                        if (record.logisticsInfo.logisticsProfile === 'DIRECT_DELIVERY') {
	                          return 'Shopee Entrega Direta';
	                        }
	                        return '-';
	                      },
	                    },
	                    { title: '物流渠道 ID', render: (_, record) => record.logisticsInfo.logisticsChannelId || '-' },
	                    { title: 'service_code', render: (_, record) => record.logisticsInfo.serviceCode || '-' },
	                    {
	                      title: '面单状态',
	                      render: (_, record) => record.logisticsInfo.shippingDocumentStatus || '-',
	                    },
	                    { title: '运单号', dataIndex: 'trackingNo', renderText: (value) => value || '-' },
	                    {
	                      title: '需补充参数',
                      render: (_, record) =>
                        record.logisticsInfo.infoNeeded.length
                          ? record.logisticsInfo.infoNeeded.join(', ')
                          : '-',
                    },
                    { title: '物流建议', dataIndex: 'dispatchRecommendation' },
                  ]}
                />
              </Card>

              <Card title="退款/发票信息">
                <ProDescriptions<ERP.OrderDetail>
                  column={1}
                  dataSource={data}
                  columns={[
                    { title: '退货申请截止', dataIndex: 'returnRequestDueDate', renderText: (value) => value || '-' },
                    { title: '预计妥投起始', dataIndex: 'edtFrom', renderText: (value) => value || '-' },
                    { title: '预计妥投截止', dataIndex: 'edtTo', renderText: (value) => value || '-' },
                    {
                      title: '发票前置状态',
                      render: (_, record) =>
                        record.orderStatus === 'PENDING_INVOICE' ? (
                          <Tag color="orange">待补发票</Tag>
                        ) : (
                          <Tag color="success">已满足发票前置</Tag>
                        ),
                    },
                    { title: '发票号码', dataIndex: ['invoiceInfo', 'number'], renderText: (value) => value || '-' },
                    { title: '发票访问键', dataIndex: ['invoiceInfo', 'accessKey'], renderText: (value) => value || '-' },
                    {
                      title: '发票总额',
                      dataIndex: ['invoiceInfo', 'totalValue'],
                      renderText: (value) => (value ? formatBrazilCurrency(value, 'BRL') : '-'),
                    },
                    { title: '税码', dataIndex: ['invoiceInfo', 'taxCode'], renderText: (value) => value || '-' },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </PageContainer>
  );
};

export default OrderDetailPage;
