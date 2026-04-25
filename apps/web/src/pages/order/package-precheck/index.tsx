import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProDescriptions, ProTable } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Alert, Button, Drawer, Modal, Space, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import {
  arrangeShipment,
  getShopeeShippingDocumentParameter,
  getShopeeShippingParameter,
  getShippingDocumentDownloadUrl,
  queryPackagePrecheck,
  syncShopeeTrackingNumber,
} from '@/services/erp/order';

function renderProfileTag(profile: ERP.PackagePrecheckItem['logisticsProfile']) {
  if (profile === 'SHOPEE_XPRESS') return <Tag color="blue">Shopee Xpress</Tag>;
  if (profile === 'DIRECT_DELIVERY') return <Tag color="gold">Entrega Direta</Tag>;
  return <Tag>Other</Tag>;
}

function renderCanShipTag(canShip: boolean) {
  return canShip ? <Tag color="success">Can Ship</Tag> : <Tag color="error">Blocked</Tag>;
}

function renderStatusTag(value?: string) {
  return <Tag>{value || '-'}</Tag>;
}

const PackagePrecheckPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [drawerRow, setDrawerRow] = useState<ERP.PackagePrecheckItem>();
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [liveShippingParameter, setLiveShippingParameter] = useState<Record<string, unknown> | null>(null);
  const [liveShippingParameterError, setLiveShippingParameterError] = useState<string>();
  const [liveDocumentParameter, setLiveDocumentParameter] = useState<Record<string, unknown> | null>(null);
  const [liveDocumentParameterError, setLiveDocumentParameterError] = useState<string>();

  const reload = () => actionRef.current?.reload?.();
  const showJsonModal = (title: string, data: unknown) =>
    Modal.info({
      title,
      width: 860,
      content: (
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Typography.Paragraph>
      ),
    });

  const openDrawer = async (record: ERP.PackagePrecheckItem) => {
    setDrawerRow(record);
    setDrawerLoading(true);
    setLiveShippingParameter(null);
    setLiveShippingParameterError(undefined);
    setLiveDocumentParameter(null);
    setLiveDocumentParameterError(undefined);

    const [shippingParameterResult, documentParameterResult] = await Promise.allSettled([
      getShopeeShippingParameter({
        shopId: record.shopId,
        orderId: record.orderId,
        orderSn: record.orderSn,
        packageNumber: record.packageNumber,
      }),
      getShopeeShippingDocumentParameter({
        shopId: record.shopId,
        orderId: record.orderId,
        orderSn: record.orderSn,
        packageNumber: record.packageNumber,
      }),
    ]);

    if (shippingParameterResult.status === 'fulfilled') {
      setLiveShippingParameter(shippingParameterResult.value.data);
    } else {
      setLiveShippingParameterError(
        shippingParameterResult.reason instanceof Error
          ? shippingParameterResult.reason.message
          : '加载 shipping parameter 失败',
      );
    }

    if (documentParameterResult.status === 'fulfilled') {
      setLiveDocumentParameter(documentParameterResult.value.data);
    } else {
      setLiveDocumentParameterError(
        documentParameterResult.reason instanceof Error
          ? documentParameterResult.reason.message
          : '加载 shipping document parameter 失败',
      );
    }

    setDrawerLoading(false);
  };

  const columns: ProColumns<ERP.PackagePrecheckItem>[] = [
    {
      title: '包裹号',
      dataIndex: 'packageNumber',
      width: 190,
      copyable: true,
    },
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 180,
      copyable: true,
    },
    {
      title: 'orderSn',
      dataIndex: 'orderSn',
      width: 180,
      copyable: true,
      hideInTable: true,
    },
    {
      title: '店铺 ID',
      dataIndex: 'shopId',
      width: 140,
    },
    {
      title: '渠道策略',
      dataIndex: 'logisticsProfile',
      width: 150,
      valueType: 'select',
      valueEnum: {
        SHOPEE_XPRESS: { text: 'Shopee Xpress' },
        DIRECT_DELIVERY: { text: 'Entrega Direta' },
        OTHER: { text: 'Other' },
      },
      render: (_, record) => renderProfileTag(record.logisticsProfile),
    },
    {
      title: '渠道 ID',
      dataIndex: 'logisticsChannelId',
      width: 120,
    },
    {
      title: '渠道名',
      dataIndex: 'logisticsChannelName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '承运商',
      dataIndex: 'shippingCarrier',
      width: 180,
      ellipsis: true,
    },
    {
      title: '运单号',
      dataIndex: 'trackingNumber',
      width: 180,
      search: false,
      renderText: (value) => value || '-',
    },
    {
      title: '包裹状态',
      dataIndex: 'packageStatus',
      width: 120,
      valueType: 'select',
    },
    {
      title: '物流状态',
      dataIndex: 'logisticsStatus',
      width: 180,
      valueType: 'select',
    },
    {
      title: '面单状态',
      dataIndex: 'shippingDocumentStatus',
      width: 140,
      valueType: 'select',
      renderText: (value) => value || '-',
    },
    {
      title: 'Can Ship',
      dataIndex: 'canShip',
      width: 110,
      valueType: 'select',
      valueEnum: {
        true: { text: '可发货' },
        false: { text: '已拦截' },
      },
      render: (_, record) => renderCanShipTag(record.canShip),
    },
    {
      title: '缺失前置条件',
      dataIndex: 'missingPreconditions',
      width: 280,
      search: false,
      render: (_, record) =>
        record.missingPreconditions.length
          ? record.missingPreconditions.map((item) => <Tag key={item}>{item}</Tag>)
          : '-',
    },
    {
      title: '最后同步',
      dataIndex: 'lastSyncTime',
      width: 180,
      search: false,
      renderText: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      search: false,
      renderText: (value) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '时间字段',
      dataIndex: 'timeField',
      valueType: 'select',
      hideInTable: true,
      initialValue: 'updatedAt',
      valueEnum: {
        updatedAt: { text: 'updatedAt' },
        lastSyncTime: { text: 'lastSyncTime' },
      },
    },
    {
      title: '时间范围',
      dataIndex: 'timeRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
      search: {
        transform: (value: string[]) => ({
          startTime: value?.[0],
          endTime: value?.[1],
        }),
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 320,
      render: (_, record) => [
        <a key="drawer" onClick={() => openDrawer(record)}>
          预检详情
        </a>,
        <a
          key="parameter"
          onClick={async () => {
            const response = await getShopeeShippingParameter({
              shopId: record.shopId,
              orderId: record.orderId,
              orderSn: record.orderSn,
              packageNumber: record.packageNumber,
            });
            showJsonModal(`shipping parameter: ${record.packageNumber}`, response.data);
            reload();
          }}
        >
          单包裹预检
        </a>,
        <a
          key="tracking"
          onClick={async () => {
            await syncShopeeTrackingNumber({
              shopId: record.shopId,
              orderId: record.orderId,
              orderSn: record.orderSn,
              packageNumber: record.packageNumber,
              responseOptionalFields:
                'plp_number,first_mile_tracking_number,last_mile_tracking_number',
            });
            message.success('已主动补拉 tracking');
            reload();
          }}
        >
          补拉运单
        </a>,
        <a
          key="ship"
          style={record.canShip ? undefined : { color: 'rgba(0,0,0,0.25)', cursor: 'not-allowed' }}
          onClick={() =>
            record.canShip
              ? Modal.confirm({
                  title: '单包裹安排出货',
                  content: `确认对 ${record.packageNumber} 调用真实 ship_order 吗？`,
                  onOk: async () => {
                    await arrangeShipment({
                      orderId: record.orderId,
                      shopId: record.shopId,
                      orderSn: record.orderSn,
                      packageNumber: record.packageNumber,
                    });
                    message.success('已调用真实 ship_order');
                    reload();
                  },
                })
              : null
          }
        >
          单包裹发货
        </a>,
      ],
    },
  ];

  return (
    <PageContainer
      title="Package 履约预检"
      subTitle="按 package 维度聚合 Shopee 履约 gate、渠道策略、最近预检日志和 shipping document 状态。"
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="预检页是 package 维度排查页"
        description="canShip 由 invoice gate、package/document gate、最近一次 shipping parameter 预检结果与 channelStrategy 共同决定；单包裹动作仍走真实 Shopee 接口。"
      />

      <ProTable<ERP.PackagePrecheckItem, ERP.PackagePrecheckQueryParams>
        rowKey="packageNumber"
        actionRef={actionRef}
        columns={columns}
        request={queryPackagePrecheck}
        search={{ labelWidth: 120 }}
        pagination={{ pageSize: 10 }}
        headerTitle="Package 履约预检工作台"
      />

      <Drawer
        width={760}
        title={drawerRow ? `预检详情: ${drawerRow.packageNumber}` : '预检详情'}
        open={Boolean(drawerRow)}
        onClose={() => setDrawerRow(undefined)}
        destroyOnClose
      >
        {drawerRow ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <ProDescriptions<ERP.PackagePrecheckItem>
              column={2}
              dataSource={drawerRow}
              columns={[
                { title: '包裹号', dataIndex: 'packageNumber', copyable: true },
                { title: '订单号', dataIndex: 'orderNo', copyable: true },
                { title: 'orderSn', dataIndex: 'orderSn', copyable: true },
                { title: '店铺 ID', dataIndex: 'shopId' },
                { title: '订单状态', dataIndex: 'orderStatus', render: (_, record) => renderStatusTag(record.orderStatus) },
                { title: '渠道策略', render: (_, record) => renderProfileTag(record.logisticsProfile) },
                { title: 'Can Ship', render: (_, record) => renderCanShipTag(record.canShip) },
                { title: '物流状态', dataIndex: 'logisticsStatus', render: (_, record) => renderStatusTag(record.logisticsStatus) },
                { title: '包裹状态', dataIndex: 'packageStatus', render: (_, record) => renderStatusTag(record.packageStatus) },
                { title: '面单状态', dataIndex: 'shippingDocumentStatus', renderText: (value) => value || '-' },
                { title: '运单号', dataIndex: 'trackingNumber', renderText: (value) => value || '-' },
                {
                  title: '订单详情',
                  render: (_, record) => <Link to={`/order/detail/${record.orderId}`}>跳转订单详情</Link>,
                },
              ]}
            />

            <Typography.Title level={5} style={{ margin: 0 }}>
              Gate 摘要
            </Typography.Title>
            <ProDescriptions
              column={1}
              dataSource={drawerRow}
              columns={[
                {
                  title: 'invoice gate',
                  render: (_, record) =>
                    record.gates.invoiceGate.pass
                      ? 'pass'
                      : record.gates.invoiceGate.reasons.join('；'),
                },
                {
                  title: 'package gate',
                  render: (_, record) =>
                    record.gates.packageGate.pass
                      ? 'pass'
                      : record.gates.packageGate.reasons.join('；'),
                },
                {
                  title: 'document gate',
                  render: (_, record) =>
                    record.gates.documentGate.pass
                      ? 'pass'
                      : record.gates.documentGate.reasons.join('；'),
                },
                {
                  title: 'shipping parameter gate',
                  render: (_, record) =>
                    record.gates.shippingParameterGate.pass
                      ? 'pass'
                      : record.gates.shippingParameterGate.reasons.join('；'),
                },
                {
                  title: 'channelStrategy gate',
                  render: (_, record) =>
                    record.gates.channelStrategyGate.reasons.length
                      ? record.gates.channelStrategyGate.reasons.join('；')
                      : 'pass',
                },
              ]}
            />

            <Typography.Title level={5} style={{ margin: 0 }}>
              渠道策略
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {JSON.stringify(drawerRow.channelStrategy, null, 2)}
              </pre>
            </Typography.Paragraph>

            <Typography.Title level={5} style={{ margin: 0 }}>
              实时 shipping parameter
            </Typography.Title>
            {drawerLoading ? <Alert type="info" showIcon message="正在加载实时预检..." /> : null}
            {liveShippingParameterError ? (
              <Alert type="warning" showIcon message={liveShippingParameterError} />
            ) : null}
            {liveShippingParameter ? (
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {JSON.stringify(liveShippingParameter, null, 2)}
                </pre>
              </Typography.Paragraph>
            ) : null}

            <Typography.Title level={5} style={{ margin: 0 }}>
              shipping document 参数 / 状态
            </Typography.Title>
            {liveDocumentParameterError ? (
              <Alert type="warning" showIcon message={liveDocumentParameterError} />
            ) : null}
            {liveDocumentParameter ? (
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {JSON.stringify(liveDocumentParameter, null, 2)}
                </pre>
              </Typography.Paragraph>
            ) : null}

            <Typography.Title level={5} style={{ margin: 0 }}>
              最近同步摘要
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {JSON.stringify(
                  {
                    latestSyncSummary: drawerRow.latestSyncSummary,
                    latestPrecheckSummary: drawerRow.latestPrecheckSummary,
                    sourceSummary: drawerRow.sourceSummary,
                    commonFailureReasons: drawerRow.commonFailureReasons,
                    precheckSource: drawerRow.precheckSource,
                  },
                  null,
                  2,
                )}
              </pre>
            </Typography.Paragraph>

            <Space wrap>
              <Button
                onClick={async () => {
                  const response = await getShopeeShippingParameter({
                    shopId: drawerRow.shopId,
                    orderId: drawerRow.orderId,
                    orderSn: drawerRow.orderSn,
                    packageNumber: drawerRow.packageNumber,
                  });
                  showJsonModal(`shipping parameter: ${drawerRow.packageNumber}`, response.data);
                  reload();
                }}
              >
                单包裹预检
              </Button>
              <Button
                onClick={async () => {
                  await syncShopeeTrackingNumber({
                    shopId: drawerRow.shopId,
                    orderId: drawerRow.orderId,
                    orderSn: drawerRow.orderSn,
                    packageNumber: drawerRow.packageNumber,
                    responseOptionalFields:
                      'plp_number,first_mile_tracking_number,last_mile_tracking_number',
                  });
                  message.success('已主动补拉 tracking');
                  reload();
                  await openDrawer(drawerRow);
                }}
              >
                补拉运单
              </Button>
              <Button
                disabled={!drawerRow.canShip}
                onClick={() =>
                  Modal.confirm({
                    title: '单包裹安排出货',
                    content: `确认对 ${drawerRow.packageNumber} 调用真实 ship_order 吗？`,
                    onOk: async () => {
                      await arrangeShipment({
                        orderId: drawerRow.orderId,
                        shopId: drawerRow.shopId,
                        orderSn: drawerRow.orderSn,
                        packageNumber: drawerRow.packageNumber,
                      });
                      message.success('已调用真实 ship_order');
                      reload();
                      await openDrawer(drawerRow);
                    },
                  })
                }
              >
                单包裹发货
              </Button>
              <Button
                onClick={async () => {
                  const response = await getShopeeShippingDocumentParameter({
                    shopId: drawerRow.shopId,
                    orderId: drawerRow.orderId,
                    orderSn: drawerRow.orderSn,
                    packageNumber: drawerRow.packageNumber,
                  });
                  showJsonModal(`shipping document parameter: ${drawerRow.packageNumber}`, response.data);
                }}
              >
                查看面单参数
              </Button>
              <Button
                disabled={!drawerRow.shippingDocumentStatus}
                href={getShippingDocumentDownloadUrl(
                  drawerRow.packageNumber,
                  drawerRow.shippingDocumentType,
                )}
                target="_blank"
              >
                下载面单
              </Button>
              <Button href={`/order/detail/${drawerRow.orderId}`}>跳转订单详情</Button>
            </Space>
          </Space>
        ) : null}
      </Drawer>
    </PageContainer>
  );
};

export default PackagePrecheckPage;
