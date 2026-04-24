import { ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Result,
  Space,
  Spin,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import {
  buildMetabaseDashboardEmbed,
  getMetabaseEmbedConfig,
} from '@/services/erp/metabase';

const MetabaseReportPage: React.FC = () => {
  const [dashboardId, setDashboardId] = useState('');
  const {
    data: config,
    isLoading: isConfigLoading,
    isError: isConfigError,
    refetch: refetchConfig,
  } = useQuery({
    queryKey: ['metabase-embed-config'],
    queryFn: getMetabaseEmbedConfig,
  });

  useEffect(() => {
    if (config?.defaultDashboardId) {
      setDashboardId(config.defaultDashboardId);
    }
  }, [config?.defaultDashboardId]);

  const embedMutation = useMutation({
    mutationFn: (nextDashboardId: string) =>
      buildMetabaseDashboardEmbed({
        dashboardId: nextDashboardId || undefined,
        options: {
          bordered: true,
          titled: true,
          refreshSeconds: 300,
        },
      }),
  });

  const handleLoadDashboard = () => {
    const targetId = dashboardId || config?.defaultDashboardId || '';
    if (!targetId) {
      return;
    }
    embedMutation.mutate(targetId);
  };

  if (isConfigLoading) {
    return (
      <PageContainer title="Metabase 报表">
        <Card>
          <Spin />
        </Card>
      </PageContainer>
    );
  }

  if (isConfigError || !config) {
    return (
      <PageContainer title="Metabase 报表">
        <Result
          status="error"
          title="无法读取 Metabase 嵌入配置"
          subTitle="请确认 ERP API 已启动，并且 /api/metabase/embed/config 可访问。"
          extra={<Button onClick={() => refetchConfig()}>重试</Button>}
        />
      </PageContainer>
    );
  }

  if (!config.enabled) {
    return (
      <PageContainer title="Metabase 报表">
        <Result
          status="warning"
          title="Metabase 嵌入尚未启用"
          subTitle="请先在后端环境变量中配置 METABASE_SITE_URL 和 METABASE_EMBED_SECRET，并在 Metabase 后台开启 static embedding。"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Metabase 报表"
      subTitle="通过 ERP API 生成 signed embed URL，在当前系统中承载 Metabase 仪表盘。"
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="当前实现使用 Metabase static embedding"
          description="后端负责签发 JWT，前端只拿可嵌入 URL。后续如果你要做更强的交互或 SSO，可以再切到 Metabase 的 modular embedding。"
        />

        <Card title="嵌入配置">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Metabase 地址">
                {config.siteUrl || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="默认 Dashboard ID">
                {config.defaultDashboardId || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Space wrap>
              <Input
                style={{ width: 240 }}
                placeholder="输入 Dashboard ID"
                value={dashboardId}
                onChange={(event) => setDashboardId(event.target.value)}
              />
              <Button
                type="primary"
                onClick={handleLoadDashboard}
                loading={embedMutation.isPending}
              >
                加载报表
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => refetchConfig()}>
                刷新配置
              </Button>
            </Space>

            <Typography.Text type="secondary">
              建议先在 Metabase 后台把目标 dashboard 发布为可嵌入，再把它的 ID
              填到 `METABASE_DEFAULT_DASHBOARD_ID`。
            </Typography.Text>
          </Space>
        </Card>

        {embedMutation.isError && (
          <Alert
            type="error"
            showIcon
            message="生成 Metabase 嵌入链接失败"
            description="请检查 dashboard ID、Metabase static embedding 配置，以及后端环境变量。"
          />
        )}

        {embedMutation.data ? (
          <Card
            title={`Dashboard ${embedMutation.data.dashboardId}`}
            bodyStyle={{ padding: 0 }}
          >
            <iframe
              title="Metabase Dashboard"
              src={embedMutation.data.url}
              style={{
                width: '100%',
                minHeight: '78vh',
                border: 0,
              }}
              allowTransparency
            />
          </Card>
        ) : (
          <Card>
            <Empty description="加载配置后，点击“加载报表”开始预览 Metabase Dashboard。" />
          </Card>
        )}
      </Space>
    </PageContainer>
  );
};

export default MetabaseReportPage;
