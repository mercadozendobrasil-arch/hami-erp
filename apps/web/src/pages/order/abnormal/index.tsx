import { useQuery } from '@tanstack/react-query';
import type { ActionType, ProColumns, ProFormInstance } from '@ant-design/pro-components';
import { FooterToolbar, PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Alert, Button, Modal, Space, Tag, Typography, message } from 'antd';
import React, { useRef, useState } from 'react';
import OrderActionModals from '../components/OrderActionModals';
import RuleDetailDrawer from '../components/RuleDetailDrawer';
import {
  ABNORMAL_CURRENT_STATUS_OPTIONS,
  ABNORMAL_CURRENT_STATUS_VALUE_ENUM,
  EXCEPTION_TAG_OPTIONS,
  LOGISTICS_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
  ORDER_STATUS_VALUE_ENUM,
  PACKAGE_FULFILLMENT_STATUS_OPTIONS,
  PACKAGE_STATUS_OPTIONS,
  PACKAGE_STATUS_VALUE_ENUM,
  RISK_LEVEL_OPTIONS,
  RISK_LEVEL_VALUE_ENUM,
  renderExceptionTags,
  renderStatusTag,
} from '../constants';
import { getOrderActionPolicies } from '../utils/actionPolicy';
import {
  ignoreAbnormalOrders,
  queryAbnormalOrders,
  queryOrderRules,
  recheckAbnormalOrders,
  transferToManual,
} from '@/services/erp/order';

const AbnormalOrderPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const formRef = useRef<ProFormInstance<ERP.OrderQueryParams> | undefined>(undefined);
  const [selectedRows, setSelectedRows] = useState<ERP.OrderListItem[]>([]);
  const [detailRuleId, setDetailRuleId] = useState<string | undefined>(undefined);

  const { data: ruleResponse } = useQuery({
    queryKey: ['order-rules-all'],
    queryFn: () => queryOrderRules({ current: 1, pageSize: 100 }),
  });

  const ruleOptions = (ruleResponse?.data || []).map((item) => ({
    label: item.ruleName,
    value: item.ruleCode,
  }));

  const runBatchConfirm = (
    title: string,
    content: string,
    handler: (payload: ERP.OrderOperationPayload) => Promise<unknown>,
    successText: string,
  ) => {
    Modal.confirm({
      title,
      content,
      onOk: async () => {
        await handler({ orderIds: selectedRows.map((item) => item.id) });
        message.success(successText);
        actionRef.current?.reloadAndRest?.();
      },
    });
  };

  const columns: ProColumns<ERP.OrderListItem>[] = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 180,
      render: (_, record) => (
        <a onClick={() => history.push(`/order/detail/${record.id}`)}>{record.orderNo}</a>
      ),
    },
    {
      title: '店铺',
      dataIndex: 'shopName',
      width: 160,
    },
    {
      title: 'Shopee 状态',
      dataIndex: 'orderStatus',
      width: 140,
      valueEnum: ORDER_STATUS_VALUE_ENUM,
      render: (_, record) => renderStatusTag(record.orderStatus, ORDER_STATUS_OPTIONS),
    },
    {
      title: '包裹状态',
      dataIndex: 'packageStatus',
      width: 140,
      valueEnum: PACKAGE_STATUS_VALUE_ENUM,
      render: (_, record) =>
        renderStatusTag(record.packageStatus, PACKAGE_STATUS_OPTIONS),
    },
    {
      title: '包裹履约状态',
      dataIndex: 'packageFulfillmentStatus',
      width: 160,
      render: (_, record) =>
        renderStatusTag(record.packageFulfillmentStatus, PACKAGE_FULFILLMENT_STATUS_OPTIONS),
    },
    {
      title: '买家',
      dataIndex: 'buyerName',
      width: 140,
    },
    {
      title: '异常标签',
      dataIndex: 'exceptionTag',
      width: 220,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(EXCEPTION_TAG_OPTIONS).map(([key, value]) => [key, { text: value.text }]),
      ),
      render: (_, record) => (
        <>
          {record.exceptionTags.map((tag) => (
            <Tag
              key={tag}
              color={EXCEPTION_TAG_OPTIONS[tag].color}
              onClick={() => {
                formRef.current?.setFieldsValue({ exceptionTag: tag });
                formRef.current?.submit?.();
              }}
            >
              {EXCEPTION_TAG_OPTIONS[tag].text}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: '命中规则',
      dataIndex: 'hitRuleCode',
      width: 220,
      valueType: 'select',
      fieldProps: { options: ruleOptions },
      render: (_, record) => (
        <>
          {record.hitRuleNames.map((name, index) => (
            <Tag
              key={record.hitRuleCodes[index]}
              color="blue"
              onClick={() => setDetailRuleId(record.hitRuleCodes[index])}
            >
              {name}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: '异常原因',
      dataIndex: 'exceptionReason',
      ellipsis: true,
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      width: 120,
      valueEnum: RISK_LEVEL_VALUE_ENUM,
      render: (_, record) => renderStatusTag(record.riskLevel, RISK_LEVEL_OPTIONS),
    },
    {
      title: '建议处理方式',
      dataIndex: 'suggestedAction',
      width: 160,
    },
    {
      title: '当前状态',
      dataIndex: 'currentStatus',
      width: 120,
      valueEnum: ABNORMAL_CURRENT_STATUS_VALUE_ENUM,
      render: (_, record) =>
        renderStatusTag(record.currentStatus, ABNORMAL_CURRENT_STATUS_OPTIONS),
    },
    {
      title: '仓库',
      dataIndex: 'warehouseName',
      width: 140,
      search: false,
    },
    {
      title: '物流状态',
      dataIndex: 'logisticsStatus',
      width: 160,
      search: false,
      render: (_, record) => renderStatusTag(record.logisticsStatus, LOGISTICS_STATUS_OPTIONS),
    },
    {
      title: '下单时间',
      dataIndex: 'orderTime',
      width: 180,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 260,
      render: (_, record) => [
        <OrderActionModals
          key="actions"
          currentOrder={record}
          allowedActions={getOrderActionPolicies({
            currentTab: 'abnormal',
            orders: [record],
          })}
          onSuccess={() => actionRef.current?.reload()}
        />,
      ],
    },
  ];

  return (
    <PageContainer title="异常订单" subTitle="展示命中规则、异常原因、风险等级和系统建议，支持直接修复与转人工。">
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="异常订单优先人工处理"
        description="点击异常标签可快速筛选，点击命中规则可查看规则详情，并结合 Shopee 主状态、包裹状态与物流状态判断当前处于哪条异常分支。"
      />
      <ProTable<ERP.OrderListItem, ERP.OrderQueryParams>
        rowKey="id"
        actionRef={actionRef}
        formRef={formRef}
        columns={columns}
        request={queryAbnormalOrders}
        headerTitle="异常订单池"
        search={{ labelWidth: 100, defaultCollapsed: false }}
        pagination={{ pageSize: 10 }}
        rowSelection={{ onChange: (_, rows) => setSelectedRows(rows) }}
        toolBarRender={() => [
          <OrderActionModals
            key="order-actions"
            selectedOrders={selectedRows}
            allowedActions={getOrderActionPolicies({
              currentTab: 'abnormal',
              orders: selectedRows,
              isBatch: true,
            })}
            onSuccess={() => actionRef.current?.reloadAndRest?.()}
          />,
          <Button
            key="manual"
            disabled={!selectedRows.length}
            onClick={() =>
              runBatchConfirm(
                '批量转人工',
                `确认将 ${selectedRows.length} 条异常订单转人工处理吗？`,
                transferToManual,
                '已批量转人工',
              )
            }
          >
            批量转人工
          </Button>,
          <Button
            key="recheck"
            disabled={!selectedRows.length}
            onClick={() =>
              runBatchConfirm(
                '批量重新校验',
                `确认对 ${selectedRows.length} 条异常订单重新校验吗？`,
                recheckAbnormalOrders,
                '已提交重新校验',
              )
            }
          >
            批量重新校验
          </Button>,
          <Button
            key="ignore"
            disabled={!selectedRows.length}
            onClick={() =>
              runBatchConfirm(
                '批量忽略异常',
                `确认忽略 ${selectedRows.length} 条异常订单吗？`,
                ignoreAbnormalOrders,
                '已忽略所选异常',
              )
            }
          >
            批量忽略异常
          </Button>,
        ]}
      />

      {selectedRows.length > 0 ? (
        <FooterToolbar
          extra={
            <Typography.Text>
              已选 <Typography.Text strong>{selectedRows.length}</Typography.Text> 条异常订单
            </Typography.Text>
          }
        >
          <Space>
            <Button
              onClick={() =>
                runBatchConfirm(
                  '批量转人工',
                  `确认将 ${selectedRows.length} 条异常订单转人工处理吗？`,
                  transferToManual,
                  '已批量转人工',
                )
              }
            >
              批量转人工
            </Button>
            <Button
              onClick={() =>
                runBatchConfirm(
                  '批量重新校验',
                  `确认对 ${selectedRows.length} 条异常订单重新校验吗？`,
                  recheckAbnormalOrders,
                  '已提交重新校验',
                )
              }
            >
              批量重新校验
            </Button>
            <Button
              onClick={() =>
                runBatchConfirm(
                  '批量忽略异常',
                  `确认忽略 ${selectedRows.length} 条异常订单吗？`,
                  ignoreAbnormalOrders,
                  '已忽略所选异常',
                )
              }
            >
              批量忽略异常
            </Button>
          </Space>
        </FooterToolbar>
      ) : null}

      <RuleDetailDrawer
        open={Boolean(detailRuleId)}
        ruleId={detailRuleId}
        onClose={() => setDetailRuleId(undefined)}
      />
    </PageContainer>
  );
};

export default AbnormalOrderPage;
