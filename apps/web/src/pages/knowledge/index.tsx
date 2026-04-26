import { ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Card, Space, Typography } from 'antd';
import React, { useMemo, useState } from 'react';

const DEFAULT_RAGFLOW_URL = 'http://localhost';

const HamiKnowledgePage: React.FC = () => {
  const [iframeKey, setIframeKey] = useState(0);

  const ragflowUrl = useMemo(() => {
    const configuredUrl = process.env.UMI_APP_RAGFLOW_URL;
    return configuredUrl?.trim() || DEFAULT_RAGFLOW_URL;
  }, []);

  const reloadIframe = () => {
    setIframeKey((key) => key + 1);
  };

  const openInNewTab = () => {
    window.open(ragflowUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <PageContainer
      title="hami知识库"
      subTitle="本地私有化 RAGFlow 知识库入口"
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="当前页面嵌入本地 RAGFlow 服务"
          description={
            <Typography.Text>
              默认地址为 <Typography.Text code>{DEFAULT_RAGFLOW_URL}</Typography.Text>。
              如需修改，请在前端环境变量中配置{' '}
              <Typography.Text code>UMI_APP_RAGFLOW_URL</Typography.Text>。
            </Typography.Text>
          }
        />

        <Card
          title="RAGFlow"
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={reloadIframe}>
                刷新
              </Button>
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={openInNewTab}
              >
                新窗口打开
              </Button>
            </Space>
          }
          bodyStyle={{ padding: 0 }}
        >
          <iframe
            key={iframeKey}
            title="hami知识库"
            src={ragflowUrl}
            style={{
              width: '100%',
              minHeight: '78vh',
              border: 0,
            }}
            allow="clipboard-read; clipboard-write"
          />
        </Card>
      </Space>
    </PageContainer>
  );
};

export default HamiKnowledgePage;
