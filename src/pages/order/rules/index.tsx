import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Modal, Space, Switch, message } from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import RuleDetailDrawer from '../components/RuleDetailDrawer';
import {
  EXCEPTION_TAG_OPTIONS,
  RISK_LEVEL_OPTIONS,
  RULE_TYPE_OPTIONS,
  renderStatusTag,
} from '../constants';
import {
  deleteOrderRule,
  queryOrderRules,
  saveOrderRule,
  toggleOrderRule,
} from '@/services/erp/order';

const RuleConfigPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<ERP.RuleConfigItem>();
  const [detailRuleId, setDetailRuleId] = useState<string>();

  const columns = useMemo<ProColumns<ERP.RuleConfigItem>[]>(
    () => [
      {
        title: '规则名称',
        dataIndex: 'ruleName',
        render: (_, record) => (
          <a onClick={() => setDetailRuleId(record.id)}>{record.ruleName}</a>
        ),
      },
      {
        title: '规则编码',
        dataIndex: 'ruleCode',
        copyable: true,
        width: 140,
      },
      {
        title: '规则类型',
        dataIndex: 'ruleType',
        width: 140,
        valueEnum: Object.fromEntries(
          Object.entries(RULE_TYPE_OPTIONS).map(([key, value]) => [key, { text: value.text }]),
        ),
        render: (_, record) => renderStatusTag(record.ruleType, RULE_TYPE_OPTIONS),
      },
      {
        title: '命中标签',
        dataIndex: 'hitTag',
        width: 120,
        valueEnum: Object.fromEntries(
          Object.entries(EXCEPTION_TAG_OPTIONS).map(([key, value]) => [key, { text: value.text }]),
        ),
        render: (_, record) => renderStatusTag(record.hitTag, EXCEPTION_TAG_OPTIONS),
      },
      {
        title: '风险等级',
        dataIndex: 'riskLevel',
        width: 110,
        valueEnum: Object.fromEntries(
          Object.entries(RISK_LEVEL_OPTIONS).map(([key, value]) => [key, { text: value.text }]),
        ),
        render: (_, record) => renderStatusTag(record.riskLevel, RISK_LEVEL_OPTIONS),
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        width: 100,
        search: false,
      },
      {
        title: '命中原因',
        dataIndex: 'hitReason',
        ellipsis: true,
      },
      {
        title: '建议处理',
        dataIndex: 'suggestedAction',
        ellipsis: true,
        search: false,
      },
      {
        title: '命中订单数',
        dataIndex: 'hitOrderCount',
        width: 110,
        search: false,
      },
      {
        title: '状态',
        dataIndex: 'enabled',
        width: 120,
        valueType: 'select',
        valueEnum: {
          true: { text: '启用' },
          false: { text: '停用' },
        },
        render: (_, record) => (
          <Switch
            checked={record.enabled}
            onChange={async () => {
              await toggleOrderRule(record.id);
              message.success(`规则已${record.enabled ? '停用' : '启用'}`);
              actionRef.current?.reload();
            }}
          />
        ),
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        width: 180,
        search: false,
      },
      {
        title: '操作',
        valueType: 'option',
        width: 180,
        render: (_, record) => [
          <a key="detail" onClick={() => setDetailRuleId(record.id)}>
            详情
          </a>,
          <a key="edit" onClick={() => setEditing(record)}>
            编辑
          </a>,
          <a
            key="delete"
            onClick={() =>
              Modal.confirm({
                title: '删除规则',
                content: `确认删除规则 ${record.ruleName} 吗？`,
                onOk: async () => {
                  await deleteOrderRule(record.id);
                  message.success('规则已删除');
                  actionRef.current?.reload();
                },
              })
            }
          >
            删除
          </a>,
        ],
      },
    ],
    [],
  );

  return (
    <PageContainer title="订单规则配置" subTitle="集中维护异常识别、风险管控和处理建议规则。">
      <ProTable<ERP.RuleConfigItem, ERP.RuleQueryParams>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        request={queryOrderRules}
        search={{ labelWidth: 92 }}
        pagination={{ pageSize: 10 }}
        toolBarRender={() => [
          <Space key="toolbar">
            <Button type="primary" onClick={() => setEditing({} as ERP.RuleConfigItem)}>
              新建规则
            </Button>
          </Space>,
        ]}
      />

      <ModalForm<ERP.RuleSavePayload>
        title={editing?.id ? '编辑规则' : '新建规则'}
        open={Boolean(editing)}
        initialValues={{
          enabled: true,
          priority: 50,
          ...editing,
        }}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setEditing(undefined),
        }}
        onFinish={async (values) => {
          await saveOrderRule({
            ...values,
            id: editing?.id,
          });
          message.success('规则已保存');
          setEditing(undefined);
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="ruleName" label="规则名称" rules={[{ required: true }]} />
        <ProFormText name="ruleCode" label="规则编码" rules={[{ required: true }]} />
        <ProFormSelect
          name="ruleType"
          label="规则类型"
          options={Object.entries(RULE_TYPE_OPTIONS).map(([key, value]) => ({
            label: value.text,
            value: key,
          }))}
          rules={[{ required: true }]}
        />
        <ProFormDigit name="priority" label="优先级" min={1} max={100} rules={[{ required: true }]} />
        <ProFormSelect
          name="hitTag"
          label="命中标签"
          options={Object.entries(EXCEPTION_TAG_OPTIONS).map(([key, value]) => ({
            label: value.text,
            value: key,
          }))}
          rules={[{ required: true }]}
        />
        <ProFormText name="hitReason" label="命中原因" rules={[{ required: true }]} />
        <ProFormText name="hitScope" label="命中范围" rules={[{ required: true }]} />
        <ProFormText name="actionType" label="执行动作" rules={[{ required: true }]} />
        <ProFormSelect
          name="riskLevel"
          label="风险等级"
          options={Object.entries(RISK_LEVEL_OPTIONS).map(([key, value]) => ({
            label: value.text,
            value: key,
          }))}
          rules={[{ required: true }]}
        />
        <ProFormText name="suggestedAction" label="建议处理方式" rules={[{ required: true }]} />
        <ProFormSwitch name="enabled" label="是否启用" />
        <ProFormTextArea name="remark" label="备注" rules={[{ required: true }]} />
      </ModalForm>

      <RuleDetailDrawer
        open={Boolean(detailRuleId)}
        ruleId={detailRuleId}
        onClose={() => setDetailRuleId(undefined)}
      />
    </PageContainer>
  );
};

export default RuleConfigPage;
