import {
  CloseOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max';
import { Button, Card, Empty, message, Space, Typography, Upload } from 'antd';
import React, { useMemo } from 'react';
import './style.less';

const sectionStyle = { marginBottom: 16 };

const ProductCreatePage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const location = useLocation();
  const shopId = useMemo(
    () => new URLSearchParams(location.search).get('shopId') || undefined,
    [location.search],
  );

  if (!shopId) {
    return (
      <PageContainer title={false}>
        <Empty description="请先选择店铺" style={{ paddingTop: 120 }}>
          <Button type="primary" onClick={() => history.push('/shop/list')}>
            返回店铺列表
          </Button>
        </Empty>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      className="erp-product-create"
      title="创建产品"
      breadcrumb={{ items: [{ title: 'Shopee' }, { title: '创建产品' }] }}
      extra={[
        <Button
          key="close"
          icon={<CloseOutlined />}
          onClick={() => history.back()}
        >
          关闭
        </Button>,
        <Button
          key="save"
          icon={<SaveOutlined />}
          onClick={() => messageApi.info('暂未接入')}
        >
          保存
        </Button>,
        <Button
          key="publish"
          type="primary"
          onClick={() => messageApi.info('暂未接入')}
        >
          发布
        </Button>,
      ]}
    >
      {contextHolder}
      <div className="erp-create-shell">
        <div className="erp-create-main">
          <ProForm
            submitter={false}
            layout="horizontal"
            labelCol={{ flex: '130px' }}
          >
            <Card id="basic" title="基本信息" style={sectionStyle}>
              <ProFormSelect
                name="shopId"
                label="店铺"
                initialValue={shopId}
                rules={[{ required: true }]}
                options={[{ label: shopId, value: shopId }]}
              />
              <ProFormText
                name="title"
                label="产品标题"
                rules={[{ required: true }]}
                fieldProps={{
                  maxLength: 120,
                  suffix: (
                    <Typography.Text type="secondary">0/120</Typography.Text>
                  ),
                }}
              />
              <ProFormSelect
                name="category"
                label="分类"
                rules={[{ required: true }]}
                placeholder="选择分类"
                fieldProps={{ suffixIcon: <SearchOutlined /> }}
              />
              <ProFormTextArea
                name="description"
                label="产品描述"
                rules={[{ required: true }]}
                fieldProps={{ rows: 8, maxLength: 3000 }}
              />
              <ProFormText name="parentSku" label="父SKU" />
              <ProFormRadio.Group
                name="preOrder"
                label="预购"
                initialValue="no"
                options={[
                  { label: '否', value: 'no' },
                  { label: '是', value: 'yes' },
                ]}
              />
              <ProFormRadio.Group
                name="condition"
                label="产品状况"
                initialValue="new"
                options={[
                  { label: '新品', value: 'new' },
                  { label: '二手', value: 'used' },
                ]}
              />
              <ProFormText
                name="sourceUrl"
                label="来源链接"
                fieldProps={{ addonAfter: '访问' }}
              />
            </Card>

            <Card id="sales" title="销售信息" style={sectionStyle}>
              <ProFormRadio.Group
                name="type"
                label="类型"
                initialValue="single"
                options={[
                  { label: '单品', value: 'single' },
                  { label: '多变种', value: 'variant' },
                ]}
              />
              <ProFormDigit
                name="price"
                label="价格"
                rules={[{ required: true }]}
                fieldProps={{ prefix: 'R$' }}
              />
              <ProFormDigit
                name="stock"
                label="库存"
                rules={[{ required: true }]}
              />
              <ProFormSelect
                name="discount"
                label="折扣活动"
                placeholder="选择一个活动"
                fieldProps={{ allowClear: true }}
              />
              <ProFormText
                name="batch"
                label="批发"
                placeholder="添加优惠区间"
              />
            </Card>

            <Card id="media" title="媒体文件" style={sectionStyle}>
              <ProForm.Item label="产品图片" required>
                <Upload listType="picture-card" beforeUpload={() => false}>
                  <button type="button">
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>添加图片</div>
                  </button>
                </Upload>
                <Typography.Text type="secondary">
                  最多上传9张图片，仅支持 JPG、JPEG、PNG。
                </Typography.Text>
              </ProForm.Item>
            </Card>

            <Card id="logistics" title="物流" style={sectionStyle}>
              <ProFormSelect
                name="packageSetting"
                label="包装设置"
                initialValue="product"
                options={[{ label: '按产品设置', value: 'product' }]}
              />
              <Space align="baseline">
                <ProFormDigit
                  name="weight"
                  label="包裹重量"
                  fieldProps={{ addonAfter: 'kg' }}
                />
              </Space>
              <Space align="baseline">
                <ProFormDigit
                  name="width"
                  label="包裹尺寸"
                  fieldProps={{ addonAfter: 'cm', placeholder: '宽度' }}
                />
                <ProFormDigit
                  name="length"
                  fieldProps={{ addonAfter: 'cm', placeholder: '长度' }}
                />
                <ProFormDigit
                  name="height"
                  fieldProps={{ addonAfter: 'cm', placeholder: '高度' }}
                />
              </Space>
              <ProFormSelect
                name="logistics"
                label="物流"
                mode="multiple"
                options={[
                  { label: 'Shopee Xpress', value: 'Shopee Xpress' },
                  { label: 'Entrega Direta', value: 'Entrega Direta' },
                ]}
              />
            </Card>

            <Card id="tax" title="税务信息">
              <ProFormText
                name="ncm"
                label="NCM"
                fieldProps={{ suffix: <SearchOutlined /> }}
              />
              <ProFormText
                name="cest"
                label="CEST"
                placeholder="如没有可不填写。填写不正确可能会失败"
              />
              <ProFormText
                name="cfopInside"
                label="CFOP (同州)"
                fieldProps={{ suffix: <SearchOutlined /> }}
              />
              <ProFormText
                name="cfopOutside"
                label="CFOP (跨州)"
                fieldProps={{ suffix: <SearchOutlined /> }}
              />
              <ProFormSelect name="csosn" label="CSOSN" placeholder="请选择" />
              <ProFormSelect name="unit" label="单位" placeholder="请选择" />
              <ProFormSelect
                name="origin"
                label="原产地"
                placeholder="请选择"
              />
            </Card>
          </ProForm>
        </div>
        <div className="erp-create-anchor">
          <a href="#basic">基本信息</a>
          <a href="#sales">销售信息</a>
          <a href="#media">媒体文件</a>
          <a href="#logistics">物流</a>
          <a href="#tax">税务信息</a>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProductCreatePage;
