import { PlusOutlined, RobotOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd';
import React from 'react';
import {
  createProductAiTask,
  queryProductAiAssets,
  queryProductAiTasks,
  queryProductMedia,
  uploadProductMedia,
} from '@/services/erp/product';

const taskTypeOptions = [
  { label: '10张营销海报', value: 'poster_batch' },
  { label: '主图优化', value: 'main_image_optimize' },
  { label: '场景图', value: 'scene_image' },
  { label: '详情页素材', value: 'detail_content_image' },
  { label: '完整编辑', value: 'full_edit' },
  { label: '局部编辑', value: 'partial_edit' },
];

const usageLabels: Record<string, string> = {
  PRODUCT_MAIN: '商品主图',
  PRODUCT_DETAIL: '详情图',
  MARKETING_MATERIAL: '营销素材',
  CHANNEL_PUBLISH: '渠道素材',
};

function toArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

const ProductMediaCenter: React.FC<{ productId: string }> = ({ productId }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [mediaForm] = Form.useForm();
  const [aiForm] = Form.useForm();

  const mediaQuery = useQuery({
    queryKey: ['product-media', productId],
    queryFn: () => queryProductMedia(productId),
  });
  const taskQuery = useQuery({
    queryKey: ['product-ai-tasks', productId],
    queryFn: () => queryProductAiTasks(productId),
  });
  const assetQuery = useQuery({
    queryKey: ['product-ai-assets', productId],
    queryFn: () => queryProductAiAssets(productId),
  });

  const medias = toArray(mediaQuery.data);
  const tasks = toArray(taskQuery.data);
  const assets = toArray(assetQuery.data);
  const sourceMediaIds = medias.map((item) => item.id).filter(Boolean);

  const refresh = () => {
    mediaQuery.refetch();
    taskQuery.refetch();
    assetQuery.refetch();
  };

  const uploadByUrl = async (values: any) => {
    await uploadProductMedia({
      productId,
      mediaType: 'image',
      sourceType: 'original',
      fileUrl: values.fileUrl,
      thumbnailUrl: values.fileUrl,
      fileName: values.fileName,
    });
    messageApi.success('原始素材已登记');
    mediaForm.resetFields();
    refresh();
  };

  const createAiTask = async (values: any) => {
    if (!sourceMediaIds.length) {
      messageApi.warning('请先登记至少一张原始素材');
      return;
    }
    await createProductAiTask({
      productId,
      taskType: values.taskType,
      sourceMediaIds,
      stylePreference: values.stylePreference,
      bizGoal: values.bizGoal,
      extraPrompt: values.extraPrompt,
      totalCount: values.totalCount,
    });
    messageApi.success('AI创作任务已创建');
    aiForm.resetFields();
    refresh();
  };

  const renderMediaList = (sourceType?: string) => {
    const list = sourceType
      ? medias.filter((item) => item.sourceType === sourceType)
      : medias;

    if (!list.length) return <Empty description="暂无素材" />;

    return (
      <List
        grid={{ gutter: 12, column: 4 }}
        dataSource={list}
        renderItem={(item) => (
          <List.Item>
            <Card size="small" cover={<img src={item.thumbnailUrl || item.fileUrl} alt={item.fileName || 'media'} />}>
              <Typography.Text ellipsis>{item.fileName || item.id}</Typography.Text>
              <div>
                <Tag>{item.mediaType}</Tag>
                <Tag>{item.sourceType}</Tag>
              </div>
            </Card>
          </List.Item>
        )}
      />
    );
  };

  return (
    <div>
      {contextHolder}
      <Tabs
        items={[
          {
            key: 'original',
            label: '原始素材',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Upload listType="picture-card" beforeUpload={() => false}>
                  <button type="button">
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>添加图片</div>
                  </button>
                </Upload>
                <Form form={mediaForm} layout="inline" onFinish={uploadByUrl}>
                  <Form.Item name="fileUrl" rules={[{ required: true, message: '请输入图片URL' }]}>
                    <Input style={{ width: 360 }} placeholder="先用图片URL登记原始素材" />
                  </Form.Item>
                  <Form.Item name="fileName">
                    <Input style={{ width: 180 }} placeholder="文件名" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">登记素材</Button>
                </Form>
                {renderMediaList('ORIGINAL')}
              </Space>
            ),
          },
          { key: 'product', label: '商品图', children: renderMediaList('PRODUCT') },
          { key: 'sku', label: 'SKU图', children: renderMediaList('SKU') },
          { key: 'video', label: '视频', children: renderMediaList('VIDEO') },
          { key: 'attachment', label: '附件', children: renderMediaList('ATTACHMENT') },
          {
            key: 'ai',
            label: '智能创作',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Card size="small" title="AI生成入口">
                  <Form form={aiForm} layout="vertical" onFinish={createAiTask}>
                    <Form.Item name="taskType" label="创作类型" rules={[{ required: true }]}>
                      <Select options={taskTypeOptions} />
                    </Form.Item>
                    <Form.Item name="totalCount" label="生成数量" initialValue={10}>
                      <InputNumber min={1} max={20} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="stylePreference" label="风格偏好">
                      <Input placeholder="modern_clean / 轻奢 / 夏季氛围" />
                    </Form.Item>
                    <Form.Item name="bizGoal" label="业务目标">
                      <Input placeholder="618活动主推 / 新品上架 / 主图优化" />
                    </Form.Item>
                    <Form.Item name="extraPrompt" label="补充Prompt">
                      <Input.TextArea rows={3} placeholder="突出卖点、场景、禁用元素等" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<RobotOutlined />}>
                      AI生成素材
                    </Button>
                  </Form>
                </Card>
                <Card size="small" title="任务状态">
                  <List
                    dataSource={tasks}
                    locale={{ emptyText: '暂无任务' }}
                    renderItem={(item) => (
                      <List.Item>
                        <Space direction="vertical" size={2}>
                          <Typography.Text>{item.taskNo}</Typography.Text>
                          <Space>
                            <Tag>{item.taskType}</Tag>
                            <Tag color="processing">{item.status}</Tag>
                            <Typography.Text type="secondary">{item.progress || 0}%</Typography.Text>
                          </Space>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
                <Card size="small" title="生成结果列表">
                  <List
                    grid={{ gutter: 12, column: 4 }}
                    dataSource={assets}
                    locale={{ emptyText: '暂无AI素材' }}
                    renderItem={(item) => {
                      const currentVersion = item.versions?.find((version: any) => version.id === item.currentVersionId) || item.versions?.[0];
                      return (
                        <List.Item>
                          <Card size="small" cover={currentVersion?.fileUrl ? <img src={currentVersion.thumbnailUrl || currentVersion.fileUrl} alt={item.assetName} /> : undefined}>
                            <Typography.Text ellipsis>{item.assetName}</Typography.Text>
                            <div>
                              <Tag>{item.assetType}</Tag>
                              <Tag>{item.publishStatus}</Tag>
                            </div>
                          </Card>
                        </List.Item>
                      );
                    }}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'usage',
            label: '素材引用',
            children: (
              <List
                dataSource={assets.flatMap((asset) =>
                  toArray(asset.usages).map((usage) => ({ ...usage, assetName: asset.assetName })),
                )}
                locale={{ emptyText: '暂无引用关系' }}
                renderItem={(item) => (
                  <List.Item>
                    <Space>
                      <Typography.Text>{item.assetName}</Typography.Text>
                      <Tag>{usageLabels[item.usageType] || item.usageType}</Tag>
                      <Typography.Text type="secondary">{item.usageTarget || '-'}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

export default ProductMediaCenter;
