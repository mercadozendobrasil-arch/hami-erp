import {
  ModalForm,
  ProDescriptions,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Alert, Button, Drawer, Modal, Tag, Tooltip, Typography, message } from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import OrderOverviewCards from '../components/OrderOverviewCards';
import { useResolvedShopId } from '../hooks/useResolvedShopId';
import {
  LOGISTICS_CHANNEL_OPTIONS,
  LOGISTICS_COMPANY_OPTIONS,
  LOGISTICS_STATUS_OPTIONS,
  LOGISTICS_STATUS_VALUE_ENUM,
  PACKAGE_STATUS_OPTIONS,
  SHOPEE_PLATFORM_STATUS_OPTIONS,
  renderStatusTag,
} from '../constants';
import {
  arrangeShipment,
  arrangeShipmentBatch,
  arrangeShipmentMass,
  assignLogisticsChannel,
  getShopeeMassShippingParameter,
  getShopeeShippingDocumentParameter,
  getShopeeShippingParameter,
  generateWaybill,
  getShippingDocumentDownloadUrl,
  queryLogisticsOrders,
  selectLogistics,
  syncShopeeMassTrackingNumber,
  syncShopeeTrackingNumber,
  updateShopeeShippingOrder,
} from '@/services/erp/order';
import { getActionBinding } from '@/services/erp/orderPlatform';

type LogisticsModalType = 'company' | 'channel' | null;

function getBindingState(rows: ERP.OrderListItem[], actionKeys: string[]) {
  if (!rows.length) {
    return { disabled: true, reason: '请选择订单' };
  }

  for (const row of rows) {
    for (const actionKey of actionKeys) {
      const binding = getActionBinding(row.processingProfile, actionKey);
      if (binding && !binding.available) {
        return { disabled: true, reason: `${row.orderNo}: ${binding.reason || '平台侧不可执行'}` };
      }
    }
  }

  return { disabled: false, reason: undefined as string | undefined };
}

const LogisticsManagementPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [selectedRows, setSelectedRows] = useState<ERP.OrderListItem[]>([]);
  const [currentRow, setCurrentRow] = useState<ERP.OrderListItem>();
  const [drawerRow, setDrawerRow] = useState<ERP.OrderListItem>();
  const [modalType, setModalType] = useState<LogisticsModalType>(null);
  const [shippingUpdateRow, setShippingUpdateRow] = useState<ERP.OrderListItem>();
  const { shopId } = useResolvedShopId();

  const reload = () => actionRef.current?.reloadAndRest?.();
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

  const columns: ProColumns<ERP.OrderListItem>[] = [
    { title: '订单号', dataIndex: 'orderNo', copyable: true, width: 180 },
    { title: '平台单号', dataIndex: 'platformOrderNo', width: 180 },
    {
      title: '平台状态',
      dataIndex: 'platformStatus',
      width: 140,
      search: false,
      render: (_, record) => renderStatusTag(record.platformStatus, SHOPEE_PLATFORM_STATUS_OPTIONS),
    },
    { title: '店铺', dataIndex: 'shopName', width: 160 },
    {
      title: '包裹状态',
      dataIndex: 'packageStatus',
      width: 120,
      search: false,
      render: (_, record) => renderStatusTag(record.packageStatus, PACKAGE_STATUS_OPTIONS),
    },
    {
      title: '包裹号',
      dataIndex: 'packageNumber',
      width: 180,
    },
    {
      title: '物流状态',
      dataIndex: 'logisticsStatus',
      width: 120,
      valueEnum: LOGISTICS_STATUS_VALUE_ENUM,
      render: (_, record) => renderStatusTag(record.logisticsStatus, LOGISTICS_STATUS_OPTIONS),
    },
    {
      title: 'Shopee 承运商',
      dataIndex: 'logisticsCompany',
      width: 140,
      valueType: 'select',
      fieldProps: {
        options: LOGISTICS_COMPANY_OPTIONS.map((item) => ({ label: item, value: item })),
      },
    },
    {
      title: 'Shopee 物流渠道',
      dataIndex: 'logisticsChannel',
      width: 140,
      valueType: 'select',
      fieldProps: {
        options: LOGISTICS_CHANNEL_OPTIONS.map((item) => ({ label: item, value: item })),
      },
    },
    {
      title: '面单状态',
      dataIndex: 'shippingDocumentStatus',
      width: 140,
      valueType: 'select',
      fieldProps: {
        options: [
          { label: 'REQUESTED', value: 'REQUESTED' },
          { label: 'READY', value: 'READY' },
          { label: 'FAILED', value: 'FAILED' },
          { label: 'PROCESSING', value: 'PROCESSING' },
        ],
      },
      renderText: (value) => value || '-',
    },
    { title: '运单号', dataIndex: 'trackingNo', width: 180, search: false },
    {
      title: '分配时间',
      dataIndex: 'logisticsAssignedAt',
      width: 180,
      search: false,
      renderText: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '推荐依据',
      dataIndex: 'dispatchRecommendation',
      ellipsis: true,
      search: false,
    },
    {
      title: '履约时效(h)',
      dataIndex: 'deliveryAging',
      width: 110,
      search: false,
    },
    {
      title: '预估运费',
      dataIndex: 'freightEstimate',
      width: 110,
      search: false,
      renderText: (value) => `BRL ${value}`,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 240,
      render: (_, record) => {
        const logisticsConstraint = getBindingState([record], ['logistics', 'tracking']);
        const waybillConstraint = getBindingState([record], ['waybill']);

        return [
          <Tooltip key="select-tip" title={logisticsConstraint.reason}>
            <a
              onClick={async () => {
                if (logisticsConstraint.disabled) return;
                const response = await getShopeeShippingParameter({
                  shopId: record.platformShopId,
                  orderId: record.id,
                  orderSn: record.orderSn,
                  packageNumber: record.packageNumber,
                });
                showJsonModal(`发货前参数校验: ${record.packageNumber}`, response.data);
              }}
              style={logisticsConstraint.disabled ? { color: 'rgba(0,0,0,0.25)', cursor: 'not-allowed' } : undefined}
            >
              查看发货参数
            </a>
          </Tooltip>,
          <a key="detail" onClick={() => setDrawerRow(record)}>
            查看物流信息
          </a>,
          <Tooltip key="ship-tip" title={logisticsConstraint.reason}>
            <a
              onClick={() =>
                logisticsConstraint.disabled
                  ? null
                  : Modal.confirm({
                      title: '安排出货',
                      content: `确认对包裹 ${record.packageNumber} 调用真实 Shopee single ship 吗？`,
                      onOk: async () => {
                        await arrangeShipment({
                          orderId: record.id,
                          orderSn: record.orderSn,
                          shopId: record.platformShopId,
                          packageNumber: record.packageNumber,
                        });
                        message.success('已调用真实 single ship');
                        reload();
                      },
                    })
              }
              style={logisticsConstraint.disabled ? { color: 'rgba(0,0,0,0.25)', cursor: 'not-allowed' } : undefined}
            >
              安排出货
            </a>
          </Tooltip>,
          <Tooltip key="tracking-tip" title={logisticsConstraint.reason}>
            <a
              onClick={() =>
                logisticsConstraint.disabled
                  ? null
                  : Modal.confirm({
                      title: '补拉运单号',
                      content: `确认对包裹 ${record.packageNumber} 主动补拉 tracking 吗？`,
                      onOk: async () => {
                        await syncShopeeTrackingNumber({
                          shopId: record.platformShopId,
                          orderId: record.id,
                          orderSn: record.orderSn,
                          packageNumber: record.packageNumber,
                          responseOptionalFields:
                            'plp_number,first_mile_tracking_number,last_mile_tracking_number',
                        });
                        message.success('已主动补拉 tracking');
                        reload();
                      },
                    })
              }
              style={logisticsConstraint.disabled ? { color: 'rgba(0,0,0,0.25)', cursor: 'not-allowed' } : undefined}
            >
              补拉运单
            </a>
          </Tooltip>,
          <Tooltip key="waybill-tip" title={waybillConstraint.reason}>
            <a
              onClick={() =>
                waybillConstraint.disabled
                  ? null
                  : Modal.confirm({
                      title: '生成运单/面单',
                      content: `确认为订单 ${record.orderNo} 生成运单/面单吗？`,
                      onOk: async () => {
                        await generateWaybill({ orderId: record.id });
                        message.success('已生成运单/面单');
                        reload();
                      },
                    })
              }
              style={waybillConstraint.disabled ? { color: 'rgba(0,0,0,0.25)', cursor: 'not-allowed' } : undefined}
            >
              生成运单/面单
            </a>
          </Tooltip>,
          <Tooltip key="update-tip" title={logisticsConstraint.reason}>
            <a
              onClick={() => {
                if (logisticsConstraint.disabled) return;
                setShippingUpdateRow(record);
              }}
              style={logisticsConstraint.disabled ? { color: 'rgba(0,0,0,0.25)', cursor: 'not-allowed' } : undefined}
            >
              更新取件
            </a>
          </Tooltip>,
          <a
            key="recommendation"
            onClick={() =>
              Modal.info({
                title: '推荐物流依据',
                content: record.dispatchRecommendation,
              })
            }
          >
            查看推荐物流依据
          </a>,
        ];
      },
    },
  ];

  const companyConstraint = getBindingState(selectedRows, ['logistics', 'tracking']);
  const channelConstraint = getBindingState(selectedRows, ['logistics']);
  const waybillConstraint = getBindingState(selectedRows, ['waybill']);
  const markConstraint = getBindingState(selectedRows, ['logistics']);

  return (
      <PageContainer title="物流管理" subTitle="围绕 package_number、get_shipping_parameter、ship_order、get_tracking_number 和 shipping document 状态展示 Shopee 物流链路。">
      <OrderOverviewCards
        shopId={shopId}
        items={[
          { key: 'total', title: '物流订单总数' },
          { key: 'readyToShipCount', title: '待出货' },
          { key: 'processedCount', title: '已安排出货' },
          { key: 'retryShipCount', title: '重新出货' },
        ]}
      />
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="物流页只展示 Shopee 物流准备与包裹追踪语义"
        description="准备物流、生成运单和重新准备都会先校验 Shopee logistics manager 是否允许执行；安排出货后主状态会进入 PROCESSED，而不是直接进入 SHIPPED。"
      />
      <ProTable<ERP.OrderListItem, ERP.OrderQueryParams>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        request={(params) =>
          shopId
            ? queryLogisticsOrders({ ...params, shopId })
            : Promise.resolve({ success: true, data: [], total: 0 })
        }
        search={{ labelWidth: 92 }}
        pagination={{ pageSize: 10 }}
        rowSelection={{ onChange: (_, rows) => setSelectedRows(rows) }}
        headerTitle="Shopee 物流准备工作台"
        toolBarRender={() => [
          <Tooltip key="company-tip" title={companyConstraint.reason}>
            <Button
              key="company"
              type="primary"
              disabled={companyConstraint.disabled}
              onClick={async () => {
                const response = await getShopeeMassShippingParameter({
                  orderIds: selectedRows.map((item) => item.id),
                  packageNumbers: selectedRows.map((item) => item.packageNumber),
                });
                showJsonModal('Mass 发货预检结果', response.data);
              }}
            >
              Mass 发货预检
            </Button>
          </Tooltip>,
          <Tooltip key="batch-ship-tip" title={companyConstraint.reason}>
            <Button
              key="batch-ship"
              disabled={companyConstraint.disabled}
              onClick={() =>
                Modal.confirm({
                  title: 'Batch 安排出货',
                  content: `确认对 ${selectedRows.length} 个包裹调用真实 Shopee batch_ship_order 吗？`,
                  onOk: async () => {
                    await arrangeShipmentBatch({
                      orderIds: selectedRows.map((item) => item.id),
                      packageNumbers: selectedRows.map((item) => item.packageNumber),
                    });
                    message.success('已调用真实 batch_ship_order');
                    reload();
                  },
                })
              }
            >
              Batch 安排出货
            </Button>
          </Tooltip>,
          <Tooltip key="mass-ship-tip" title={companyConstraint.reason}>
            <Button
              key="mass-ship"
              disabled={companyConstraint.disabled}
              onClick={() =>
                Modal.confirm({
                  title: 'Mass 安排出货',
                  content: `确认对 ${selectedRows.length} 个包裹调用真实 Shopee mass_ship_order 吗？`,
                  onOk: async () => {
                    await arrangeShipmentMass({
                      orderIds: selectedRows.map((item) => item.id),
                      packageNumbers: selectedRows.map((item) => item.packageNumber),
                    });
                    message.success('已调用真实 mass_ship_order');
                    reload();
                  },
                })
              }
            >
              Mass 安排出货
            </Button>
          </Tooltip>,
          <Tooltip key="tracking-mass-tip" title={markConstraint.reason}>
            <Button
              key="tracking-mass"
              disabled={markConstraint.disabled}
              onClick={() =>
                Modal.confirm({
                  title: 'Mass 补拉运单',
                  content: `确认对 ${selectedRows.length} 个包裹主动补拉 tracking 吗？`,
                  onOk: async () => {
                    await syncShopeeMassTrackingNumber({
                      orderIds: selectedRows.map((item) => item.id),
                      packageNumbers: selectedRows.map((item) => item.packageNumber),
                      responseOptionalFields:
                        'plp_number,first_mile_tracking_number,last_mile_tracking_number',
                    });
                    message.success('已主动补拉 mass tracking');
                    reload();
                  },
                })
              }
            >
              Mass 补拉运单
            </Button>
          </Tooltip>,
          <Tooltip key="channel-tip" title={channelConstraint.reason}>
            <Button
              key="channel"
              disabled={channelConstraint.disabled}
              onClick={() => {
                setCurrentRow(undefined);
                setModalType('channel');
              }}
            >
              批量更新物流渠道
            </Button>
          </Tooltip>,
          <Tooltip key="waybill-tip" title={waybillConstraint.reason}>
            <Button
              key="waybill"
              disabled={waybillConstraint.disabled}
              onClick={() =>
                Modal.confirm({
                  title: '批量生成运单',
                  content: `确认生成 ${selectedRows.length} 条订单的运单/面单吗？`,
                  onOk: async () => {
                    await generateWaybill({ orderIds: selectedRows.map((item) => item.id) });
                    message.success('已生成运单/面单');
                    reload();
                  },
                })
              }
            >
              批量生成运单/面单
            </Button>
          </Tooltip>,
          <Button
            key="export"
            onClick={() => message.success(`已提交 ${selectedRows.length || 0} 条物流订单导出任务`)}
          >
            批量导出
          </Button>,
        ]}
      />

      <ModalForm
        title={currentRow ? '准备物流' : modalType === 'company' ? '批量准备物流' : '批量更新物流渠道'}
        open={Boolean(modalType)}
        modalProps={{ destroyOnClose: true, onCancel: () => setModalType(null) }}
        initialValues={{
          logisticsCompany: currentRow?.logisticsCompany,
          logisticsChannel: currentRow?.logisticsChannel,
        }}
        onFinish={async (values) => {
          if (modalType === 'company') {
            await selectLogistics({
              orderIds: currentRow ? [currentRow.id] : selectedRows.map((item) => item.id),
              logisticsCompany: values.logisticsCompany,
              logisticsChannel: values.logisticsChannel,
            });
            message.success(currentRow ? '物流准备信息已更新' : '已批量更新物流准备信息');
          }
          if (modalType === 'channel') {
            await assignLogisticsChannel({
              orderIds: currentRow ? [currentRow.id] : selectedRows.map((item) => item.id),
              logisticsChannel: values.logisticsChannel,
            });
            message.success('已批量更新物流渠道');
          }
          setModalType(null);
          reload();
          return true;
        }}
      >
        {modalType === 'company' ? (
          <>
            <ProFormSelect
              name="logisticsCompany"
              label="物流商"
              options={LOGISTICS_COMPANY_OPTIONS.map((item) => ({ label: item, value: item }))}
              rules={[{ required: true }]}
            />
            <ProFormSelect
              name="logisticsChannel"
              label="物流渠道"
              options={LOGISTICS_CHANNEL_OPTIONS.map((item) => ({ label: item, value: item }))}
              rules={[{ required: true }]}
            />
          </>
        ) : (
          <ProFormSelect
            name="logisticsChannel"
            label="物流渠道"
            options={LOGISTICS_CHANNEL_OPTIONS.map((item) => ({ label: item, value: item }))}
            rules={[{ required: true }]}
          />
        )}
      </ModalForm>

      <Drawer
        width={560}
        title="物流信息"
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
              { title: '包裹号', dataIndex: 'packageNumber' },
              { title: '物流状态', render: (_, record) => renderStatusTag(record.logisticsStatus, LOGISTICS_STATUS_OPTIONS) },
              { title: '物流商', dataIndex: 'logisticsCompany' },
              { title: '物流渠道', dataIndex: 'logisticsChannel' },
              {
                title: '物流模式',
                render: (_, record) => {
                  const profile = record.packageList[0]?.logisticsProfile;
                  if (profile === 'SHOPEE_XPRESS') return <Tag color="blue">Shopee Xpress</Tag>;
                  if (profile === 'DIRECT_DELIVERY') return <Tag color="gold">Entrega Direta</Tag>;
                  return '-';
                },
              },
              { title: '物流渠道 ID', render: (_, record) => record.packageList[0]?.logisticsChannelId || '-' },
              { title: 'service_code', render: (_, record) => record.packageList[0]?.serviceCode || '-' },
              { title: '面单状态', render: (_, record) => record.packageList[0]?.shippingDocumentStatus || '-' },
              { title: '面单类型', render: (_, record) => record.packageList[0]?.shippingDocumentType || '-' },
              { title: '面单同步时间', render: (_, record) => record.packageList[0]?.lastDocumentSyncTime || '-' },
              {
                title: '面单参数',
                render: (_, record) => (
                  <a
                    onClick={async () => {
                      const response = await getShopeeShippingDocumentParameter({
                        shopId: record.platformShopId,
                        orderId: record.id,
                        orderSn: record.orderSn,
                        packageNumber: record.packageNumber,
                      });
                      showJsonModal(`面单参数: ${record.packageNumber}`, response.data);
                    }}
                  >
                    查看建议类型
                  </a>
                ),
              },
              {
                title: '面单下载',
                render: (_, record) =>
                  record.packageList[0]?.documentUrl || record.packageList[0]?.downloadRef ? (
                    <a
                      href={getShippingDocumentDownloadUrl(
                        record.packageNumber,
                        record.packageList[0]?.shippingDocumentType,
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
              { title: '运单号', dataIndex: 'trackingNo' },
              { title: 'Shopee 平台状态', render: (_, record) => renderStatusTag(record.platformStatus, SHOPEE_PLATFORM_STATUS_OPTIONS) },
              { title: '需要补充的参数', render: (_, record) => (record.infoNeeded.length ? record.infoNeeded.join(', ') : '-') },
              { title: '分配时间', dataIndex: 'logisticsAssignedAt' },
              { title: '推荐依据', dataIndex: 'dispatchRecommendation' },
              { title: '履约时效', render: (_, record) => `${record.deliveryAging} 小时` },
              { title: '预估运费', render: (_, record) => `BRL ${record.freightEstimate}` },
              { title: 'Shopee 物流接口', dataIndex: ['processingProfile', 'logisticsEndpoint'] },
            ]}
          />
        ) : null}
      </Drawer>

      <ModalForm
        title="更新取件信息"
        open={Boolean(shippingUpdateRow)}
        modalProps={{ destroyOnClose: true, onCancel: () => setShippingUpdateRow(undefined) }}
        onFinish={async (values) => {
          if (!shippingUpdateRow) {
            return false;
          }
          await updateShopeeShippingOrder({
            orderId: shippingUpdateRow.id,
            orderSn: shippingUpdateRow.orderSn,
            shopId: shippingUpdateRow.platformShopId,
            packageNumber: shippingUpdateRow.packageNumber,
            pickup: {
              addressId: values.addressId,
              pickupTimeId: values.pickupTimeId,
            },
          });
          message.success('已调用真实 update_shipping_order');
          setShippingUpdateRow(undefined);
          reload();
          return true;
        }}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="仅适用于 pickup 改约场景"
          description="如果当前包裹不是 pickup 模式，后端会返回真实 Shopee 错误或场景限制。"
        />
        <ProFormDigit
          name="addressId"
          label="pickup address_id"
          rules={[{ required: true, message: '请输入 address_id' }]}
        />
        <ProFormText
          name="pickupTimeId"
          label="pickup_time_id"
          rules={[{ required: true, message: '请输入 pickup_time_id' }]}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default LogisticsManagementPage;
