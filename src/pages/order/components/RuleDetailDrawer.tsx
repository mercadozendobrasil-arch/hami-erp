import { ProDescriptions } from '@ant-design/pro-components';
import { Drawer } from 'antd';
import React from 'react';
import { getOrderRuleDetail } from '@/services/erp/order';
import {
  EXCEPTION_TAG_OPTIONS,
  RISK_LEVEL_OPTIONS,
  RULE_TYPE_OPTIONS,
  renderStatusTag,
} from '../constants';

type RuleDetailDrawerProps = {
  open: boolean;
  ruleId?: string;
  onClose: () => void;
};

const RuleDetailDrawer: React.FC<RuleDetailDrawerProps> = ({ open, ruleId, onClose }) => {
  return (
    <Drawer
      width={620}
      title="规则详情"
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {ruleId ? (
        <ProDescriptions<ERP.RuleConfigItem>
          column={1}
          request={async () => ({
            data: await getOrderRuleDetail(ruleId),
          })}
          columns={[
            { title: '规则名称', dataIndex: 'ruleName' },
            { title: '规则编码', dataIndex: 'ruleCode' },
            {
              title: '规则类型',
              dataIndex: 'ruleType',
              render: (_, record) => renderStatusTag(record.ruleType, RULE_TYPE_OPTIONS),
            },
            { title: '命中标签', render: (_, record) => renderStatusTag(record.hitTag, EXCEPTION_TAG_OPTIONS) },
            { title: '风险等级', render: (_, record) => renderStatusTag(record.riskLevel, RISK_LEVEL_OPTIONS) },
            { title: '命中范围', dataIndex: 'hitScope' },
            { title: '命中原因', dataIndex: 'hitReason' },
            { title: '建议处理', dataIndex: 'suggestedAction' },
            { title: '执行动作', dataIndex: 'actionType' },
            { title: '命中订单数', dataIndex: 'hitOrderCount' },
            { title: '备注', dataIndex: 'remark' },
            { title: '启用状态', render: (_, record) => (record.enabled ? '启用' : '停用') },
            { title: '创建时间', dataIndex: 'createdAt' },
            { title: '更新时间', dataIndex: 'updatedAt' },
          ]}
        />
      ) : null}
    </Drawer>
  );
};

export default RuleDetailDrawer;
