import {
  ModalForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Button, Form, Input, Modal, message, Space, Tooltip } from 'antd';
import React, { useMemo, useState } from 'react';
import {
  addInvoiceData,
  arrangeShipment,
  arrangeShipmentMass,
  assignWarehouse,
  auditOrders,
  cancelOrders,
  createAfterSale,
  lockOrders,
  manualSyncOrders,
  mergeOrders,
  reverseAuditOrders,
  selectLogistics,
  splitOrders,
  syncShopeeMassTrackingNumber,
  syncShopeeTrackingNumber,
  tagOrders,
  unlockOrders,
  updateOrderAddress,
  updateOrderRemark,
} from '@/services/erp/order';
import {
  EXCEPTION_TAG_OPTIONS,
  LOGISTICS_CHANNEL_OPTIONS,
  LOGISTICS_COMPANY_OPTIONS,
  WAREHOUSE_OPTIONS,
} from '../constants';
import type {
  OrderActionKey,
  OrderActionPolicyItem,
} from '../utils/actionPolicy';

type ModalType =
  | 'invoice'
  | 'remark'
  | 'address'
  | 'warehouse'
  | 'logistics'
  | 'shipment'
  | 'tag'
  | null;

type OrderActionModalsProps = {
  currentOrder?: ERP.OrderListItem;
  selectedOrders?: ERP.OrderListItem[];
  allowedActions?: OrderActionPolicyItem[];
  visibleActionKeys?: OrderActionKey[];
  onSuccess: () => void;
};

const TRACKING_RESPONSE_OPTIONAL_FIELDS =
  'plp_number,first_mile_tracking_number,last_mile_tracking_number';

function summarizeTrackingSyncResult(response: unknown) {
  const data =
    response && typeof response === 'object' && 'data' in response
      ? (response as { data?: unknown }).data
      : response;

  if (!data || typeof data !== 'object') {
    return { trackedCount: 0, pendingCount: 0 };
  }

  if ('trackingNumber' in data) {
    return {
      trackedCount: (data as { trackingNumber?: string }).trackingNumber
        ? 1
        : 0,
      pendingCount: (data as { trackingNumber?: string }).trackingNumber
        ? 0
        : 1,
    };
  }

  if (
    'groups' in data &&
    Array.isArray((data as { groups?: unknown[] }).groups)
  ) {
    const groups = (
      data as {
        groups?: Array<{
          successList?: Array<{ trackingNumber?: string }>;
        }>;
      }
    ).groups;
    const successList = (groups || []).flatMap(
      (group) => group.successList || [],
    );
    const trackedCount = successList.filter((item) =>
      Boolean(item.trackingNumber),
    ).length;
    return {
      trackedCount,
      pendingCount: Math.max(successList.length - trackedCount, 0),
    };
  }

  return { trackedCount: 0, pendingCount: 0 };
}

function buildPayload(
  currentOrder?: ERP.OrderListItem,
  selectedOrders: ERP.OrderListItem[] = [],
) {
  const ids = selectedOrders.length
    ? selectedOrders.map((item) => item.id)
    : currentOrder?.id
      ? [currentOrder.id]
      : [];

  return {
    orderIds: ids,
    orderId: currentOrder?.id,
    orderNo: currentOrder?.orderNo,
    orderSn: currentOrder?.orderSn,
    shopId: currentOrder?.platformShopId,
  };
}

const OrderActionModals: React.FC<OrderActionModalsProps> = ({
  currentOrder,
  selectedOrders = [],
  allowedActions,
  visibleActionKeys,
  onSuccess,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [addressForm] = Form.useForm<ERP.AddressInfo>();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const detailInvoice = (currentOrder as ERP.OrderDetail | undefined)
    ?.invoiceInfo;

  const targetCount = selectedOrders.length || (currentOrder ? 1 : 0);
  const hasTarget = targetCount > 0;

  const payload = useMemo(
    () => buildPayload(currentOrder, selectedOrders),
    [currentOrder, selectedOrders],
  );
  const actionMap = useMemo(
    () =>
      new Map<OrderActionKey, OrderActionPolicyItem>(
        (allowedActions || []).map((item) => [item.key, item]),
      ),
    [allowedActions],
  );
  const getActionPolicy = (action: OrderActionKey) =>
    allowedActions
      ? actionMap.get(action) || { key: action, visible: false, disabled: true }
      : { key: action, visible: true, disabled: false };
  const renderActionButton = (
    action: OrderActionKey,
    label: string,
    onClick: () => void,
    danger = false,
  ) => {
    if (visibleActionKeys?.length && !visibleActionKeys.includes(action)) {
      return null;
    }
    const policy = getActionPolicy(action);
    if (!policy.visible) {
      return null;
    }
    return (
      <Tooltip key={action} title={policy.disabled ? policy.reason : undefined}>
        <Button
          size="small"
          danger={danger}
          disabled={policy.disabled}
          onClick={onClick}
        >
          {label}
        </Button>
      </Tooltip>
    );
  };

  const runAction = async (
    action: (payload: ERP.OrderOperationPayload) => Promise<unknown>,
    extraPayload: ERP.OrderOperationPayload = {},
    successText = '操作成功',
  ) => {
    if (!hasTarget) {
      messageApi.warning('请先选择订单');
      return;
    }

    await action({
      ...payload,
      ...extraPayload,
    });

    messageApi.success(successText);
    onSuccess();
  };

  const openConfirm = (
    title: string,
    content: string,
    action: (payload: ERP.OrderOperationPayload) => Promise<unknown>,
    successText: string,
  ) => {
    if (!hasTarget) {
      messageApi.warning('请先选择订单');
      return;
    }

    Modal.confirm({
      title,
      content,
      onOk: () => runAction(action, {}, successText),
    });
  };

  const syncTrackingAfterShipment = async () => {
    if (selectedOrders.length || !currentOrder?.packageNumber) {
      return syncShopeeMassTrackingNumber({
        ...payload,
        responseOptionalFields: TRACKING_RESPONSE_OPTIONAL_FIELDS,
      });
    }

    return syncShopeeTrackingNumber({
      shopId: currentOrder.platformShopId,
      orderId: currentOrder.id,
      orderNo: currentOrder.orderNo,
      orderSn: currentOrder.orderSn,
      packageNumber: currentOrder.packageNumber,
      responseOptionalFields: TRACKING_RESPONSE_OPTIONAL_FIELDS,
    });
  };

  const arrangeShipmentAfterAudit = async () => {
    if (selectedOrders.length) {
      await arrangeShipmentMass({
        ...payload,
        packageNumbers: selectedOrders
          .map((item) => item.packageNumber)
          .filter((item): item is string => Boolean(item)),
      });
      return;
    }

    await arrangeShipment({
      shopId: currentOrder?.platformShopId,
      orderId: currentOrder?.id,
      orderNo: currentOrder?.orderNo,
      orderSn: currentOrder?.orderSn,
      packageNumber: currentOrder?.packageNumber,
    });
  };

  const handleAudit = () => {
    if (!hasTarget) {
      messageApi.warning('请先选择订单');
      return;
    }

    Modal.confirm({
      title: '审核订单',
      content: `确认审核 ${targetCount} 条订单吗？`,
      onOk: async () => {
        await auditOrders(payload);

        let shipmentFailedMessage: string | undefined;
        let trackingFailedMessage: string | undefined;
        let trackingPendingMessage: string | undefined;
        try {
          await arrangeShipmentAfterAudit();

          try {
            const trackingResponse = await syncTrackingAfterShipment();
            const trackingSummary =
              summarizeTrackingSyncResult(trackingResponse);
            if (trackingSummary.pendingCount > 0) {
              trackingPendingMessage =
                trackingSummary.trackedCount > 0
                  ? '审核完成、已安排发货，部分运单暂未回流；系统会在后台每 5 分钟自动重试。'
                  : '审核完成、已安排发货，但 Shopee 暂未返回运单号；系统会在后台每 5 分钟自动重试。';
            }
          } catch (error) {
            trackingFailedMessage =
              error instanceof Error
                ? error.message
                : '调用 Shopee tracking 接口失败';
          }
        } catch (error) {
          shipmentFailedMessage =
            error instanceof Error
              ? error.message
              : '调用 Shopee 安排发货接口失败';
        }

        messageApi.success(
          shipmentFailedMessage
            ? '审核完成'
            : trackingFailedMessage
              ? '审核完成，已自动安排发货'
              : trackingPendingMessage
                ? '审核完成，已自动安排发货'
                : '审核完成，已自动安排发货并回流运单',
        );
        if (shipmentFailedMessage) {
          messageApi.warning(
            `审核完成，但自动安排发货失败：${shipmentFailedMessage}`,
          );
        } else if (trackingFailedMessage) {
          messageApi.warning(
            `审核完成、已安排发货，但自动补拉运单失败：${trackingFailedMessage}`,
          );
        } else if (trackingPendingMessage) {
          messageApi.info(trackingPendingMessage);
        }
        onSuccess();
      },
    });
  };

  return (
    <>
      {contextHolder}
      <Space wrap>
        {renderActionButton('invoice', '补发票信息', () =>
          setModalType('invoice'),
        )}
        {renderActionButton('audit', '审核订单', handleAudit)}
        {renderActionButton('reverseAudit', '反审核', () =>
          openConfirm(
            '反审核订单',
            `确认反审核 ${targetCount} 条订单吗？`,
            reverseAuditOrders,
            '反审核完成',
          ),
        )}
        {renderActionButton('remark', '修改备注', () => setModalType('remark'))}
        {!selectedOrders.length
          ? renderActionButton('address', '修改地址', () =>
              setModalType('address'),
            )
          : null}
        {renderActionButton('lock', '锁定订单', () =>
          openConfirm(
            '锁定订单',
            `确认锁定 ${targetCount} 条订单吗？`,
            lockOrders,
            '订单已锁定',
          ),
        )}
        {renderActionButton('unlock', '解锁订单', () =>
          openConfirm(
            '解锁订单',
            `确认解锁 ${targetCount} 条订单吗？`,
            unlockOrders,
            '订单已解锁',
          ),
        )}
        {renderActionButton('split', '拆单', () =>
          openConfirm(
            '拆单',
            `确认对 ${targetCount} 条订单执行拆单吗？`,
            splitOrders,
            '拆单操作已记录',
          ),
        )}
        {renderActionButton('merge', '合单', () =>
          openConfirm(
            '合单',
            `确认对 ${targetCount} 条订单执行合单吗？`,
            mergeOrders,
            '合单操作已记录',
          ),
        )}
        {renderActionButton('warehouse', '分配仓库', () =>
          setModalType('warehouse'),
        )}
        {renderActionButton('logistics', '选择物流', () =>
          setModalType('logistics'),
        )}
        {renderActionButton('shipment', '安排出货', () =>
          setModalType('shipment'),
        )}
        {renderActionButton(
          'cancel',
          '取消订单',
          () =>
            openConfirm(
              '取消订单',
              `确认取消 ${targetCount} 条订单吗？`,
              cancelOrders,
              '订单已取消',
            ),
          true,
        )}
        {renderActionButton('afterSale', '发起售后', () =>
          openConfirm(
            '发起售后',
            `确认发起 ${targetCount} 条订单售后吗？`,
            createAfterSale,
            '售后已发起',
          ),
        )}
        {renderActionButton('manualSync', '手动同步平台', () =>
          openConfirm(
            '手动同步平台',
            `确认同步 ${targetCount} 条订单到平台吗？`,
            manualSyncOrders,
            '同步任务已提交',
          ),
        )}
        {renderActionButton('tag', '打标签', () => setModalType('tag'))}
      </Space>

      <ModalForm
        title="补发票信息"
        open={modalType === 'invoice'}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalType(null),
        }}
        initialValues={{
          number: '',
          seriesNumber: '',
          accessKey: '',
          issueDate: detailInvoice?.issueDate || '',
          totalValue: currentOrder?.totalAmount,
          productsTotalValue:
            detailInvoice?.productsTotalValue || currentOrder?.totalAmount,
          taxCode: detailInvoice?.taxCode || '',
        }}
        onFinish={async (values) => {
          await runAction(
            addInvoiceData,
            {
              invoiceData: {
                number: values.number,
                seriesNumber: values.seriesNumber,
                accessKey: values.accessKey,
                issueDate: values.issueDate,
                totalValue: values.totalValue,
                productsTotalValue: values.productsTotalValue,
                taxCode: values.taxCode,
              },
            },
            '发票信息已提交，并触发真实详情刷新',
          );
          setModalType(null);
          return true;
        }}
      >
        <ProFormText
          name="number"
          label="发票号码"
          rules={[{ required: true, message: '请输入发票号码' }]}
        />
        <ProFormText name="seriesNumber" label="系列号" />
        <ProFormText
          name="accessKey"
          label="发票访问键"
          rules={[{ required: true, message: '请输入发票访问键' }]}
        />
        <ProFormText
          name="issueDate"
          label="开票日期"
          extra="建议使用 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss。"
          rules={[{ required: true, message: '请输入开票日期' }]}
        />
        <ProFormText
          name="totalValue"
          label="发票总额"
          rules={[{ required: true, message: '请输入发票总额' }]}
        />
        <ProFormText name="productsTotalValue" label="商品总额" />
        <ProFormText name="taxCode" label="税码" />
      </ModalForm>

      <ModalForm
        title="修改备注"
        open={modalType === 'remark'}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalType(null),
        }}
        onFinish={async (values) => {
          await runAction(
            updateOrderRemark,
            { remark: values.remark },
            '备注已更新',
          );
          setModalType(null);
          return true;
        }}
      >
        <ProFormTextArea
          name="remark"
          label="备注"
          fieldProps={{ maxLength: 200, showCount: true }}
          rules={[{ required: true, message: '请输入备注' }]}
        />
      </ModalForm>

      <ModalForm
        title="分配仓库"
        open={modalType === 'warehouse'}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalType(null),
        }}
        onFinish={async (values) => {
          await runAction(
            assignWarehouse,
            { warehouseName: values.warehouseName },
            '仓库分配完成',
          );
          setModalType(null);
          return true;
        }}
      >
        <ProFormSelect
          name="warehouseName"
          label="仓库"
          options={WAREHOUSE_OPTIONS.map((item) => ({
            label: item,
            value: item,
          }))}
          rules={[{ required: true, message: '请选择仓库' }]}
        />
      </ModalForm>

      <ModalForm
        title="准备物流参数"
        open={modalType === 'logistics'}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalType(null),
        }}
        onFinish={async (values) => {
          await runAction(
            selectLogistics,
            {
              logisticsCompany: values.logisticsCompany,
              logisticsService: values.logisticsChannel,
              logisticsChannel: values.logisticsChannel,
            },
            '物流参数已更新',
          );
          setModalType(null);
          return true;
        }}
      >
        <ProFormSelect
          name="logisticsCompany"
          label="物流商"
          options={LOGISTICS_COMPANY_OPTIONS.map((item) => ({
            label: item,
            value: item,
          }))}
          rules={[{ required: true, message: '请选择物流商' }]}
        />
        <ProFormSelect
          name="logisticsChannel"
          label="物流渠道"
          options={LOGISTICS_CHANNEL_OPTIONS.map((item) => ({
            label: item,
            value: item,
          }))}
          rules={[{ required: true, message: '请选择物流渠道' }]}
        />
      </ModalForm>

      <ModalForm
        title="订单打标签"
        open={modalType === 'tag'}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalType(null),
        }}
        onFinish={async (values) => {
          await runAction(tagOrders, { tags: values.tags }, '标签已更新');
          setModalType(null);
          return true;
        }}
      >
        <ProFormSelect
          name="tags"
          label="异常标签"
          mode="multiple"
          options={Object.entries(EXCEPTION_TAG_OPTIONS).map(
            ([key, value]) => ({
              label: value.text,
              value: key,
            }),
          )}
          rules={[{ required: true, message: '请选择至少一个标签' }]}
        />
      </ModalForm>

      <ModalForm
        title="安排出货"
        open={modalType === 'shipment'}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalType(null),
        }}
        onFinish={async (values) => {
          await runAction(
            arrangeShipment,
            {
              trackingNo: values.trackingNo,
            },
            targetCount > 1
              ? '已调用真实 Shopee 发货链路（batch）'
              : '已调用真实 Shopee 发货链路（single）',
          );
          setModalType(null);
          return true;
        }}
      >
        <ProFormText
          name="trackingNo"
          label="运单号"
          extra="仅在 non_integrated 或文档要求 tracking_number 时填写；pickup/dropoff 参数由后端按 shipping parameter 自动选择。"
        />
      </ModalForm>

      <Modal
        title="修改地址"
        open={modalType === 'address'}
        onCancel={() => setModalType(null)}
        onOk={async () => {
          setConfirmLoading(true);
          try {
            const values = await addressForm.validateFields();
            await runAction(
              updateOrderAddress,
              { addressInfo: values },
              '地址已更新',
            );
            setModalType(null);
          } finally {
            setConfirmLoading(false);
          }
        }}
        confirmLoading={confirmLoading}
        destroyOnClose
      >
        <Form
          form={addressForm}
          layout="vertical"
          initialValues={{
            receiverName: currentOrder?.buyerName,
            country: 'Brazil',
          }}
        >
          <Form.Item
            name="receiverName"
            label="收件人"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="receiverPhone"
            label="手机号"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="country" label="国家" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="state" label="州" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="city" label="城市" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="district" label="区" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="addressLine1"
            label="地址1"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="addressLine2" label="地址2">
            <Input />
          </Form.Item>
          <Form.Item name="zipCode" label="邮编" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default OrderActionModals;
