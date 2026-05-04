import {
  CheckCircleOutlined,
  LinkOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  message,
  Row,
  Space,
  Typography,
} from 'antd';
import React, { useEffect, useMemo } from 'react';
import {
  getShopeeAuthUrl,
  submitShopeeAuthCallback,
} from '@/services/erp/shop';

const SHOPEE_TEST_REDIRECT_URI = 'https://staging.hamimih.com/shop/auth/';

const ShopAuthPage: React.FC = () => {
  const location = useLocation();
  const [messageApi, contextHolder] = message.useMessage();
  const { status, authorizedShopId, errorMessage } = useMemo(() => {
    const search = new URLSearchParams(location.search);

    return {
      status: search.get('status'),
      authorizedShopId: search.get('shopId'),
      errorMessage: search.get('message'),
    };
  }, [location.search]);

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const code = search.get('code');
    const shopId = search.get('shop_id') || search.get('shopId');

    if (!code || !shopId || status === 'authorized') {
      return;
    }

    submitShopeeAuthCallback({ code, shopId })
      .then(() => {
        messageApi.success('Shopee 店铺授权成功');
        history.replace(`/shop/auth?status=authorized&shopId=${shopId}`);
      })
      .catch((error) => {
        console.error(error);
        messageApi.error('Shopee 店铺授权保存失败');
      });
  }, [location.search, messageApi, status]);

  const handleAuthorize = async () => {
    try {
      const response = await getShopeeAuthUrl(SHOPEE_TEST_REDIRECT_URI);
      window.location.href = response.url;
    } catch (error) {
      console.error(error);
      messageApi.error('获取 Shopee 授权链接失败，请稍后重试。');
    }
  };

  return (
    <PageContainer
      title="Shopee 授权入口"
      subTitle="第一阶段先打通店铺授权与基础数据联调闭环。"
    >
      {contextHolder}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {status === 'authorized' && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="授权成功"
            description={`店铺 ${authorizedShopId ?? '-'} 已完成授权，现在可以进入店铺列表继续查看。`}
          />
        )}

        {status === 'error' && (
          <Alert
            type="error"
            showIcon
            message="授权失败"
            description={
              errorMessage || 'Shopee 授权流程未完成，请重新发起授权。'
            }
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="授权说明">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Typography.Paragraph>
                  前端只调用 ERP API 获取授权地址，然后跳转到 Shopee 授权页。
                </Typography.Paragraph>
                <Typography.Paragraph>
                  `partner key`、`access token`、`refresh token`
                  和签名逻辑都只保留在后端。
                </Typography.Paragraph>
                <Space wrap>
                  <Button
                    type="primary"
                    icon={<LinkOutlined />}
                    onClick={handleAuthorize}
                  >
                    发起 Shopee 授权
                  </Button>
                  <Button onClick={() => history.push('/shop/list')}>
                    查看店铺列表
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="第一阶段范围">
              <Space direction="vertical" size={12}>
                <Typography.Text>1. 店铺授权入口</Typography.Text>
                <Typography.Text>2. 店铺列表</Typography.Text>
                <Typography.Text>3. 商品列表</Typography.Text>
                <Typography.Text>4. 订单列表</Typography.Text>
              </Space>
            </Card>
            <Card
              title="快捷入口"
              style={{ marginTop: 16 }}
              extra={<ShopOutlined />}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block onClick={() => history.push('/shop/list')}>
                  打开店铺列表
                </Button>
                <Button
                  block
                  onClick={() =>
                    history.push(
                      authorizedShopId
                        ? `/product/list?shopId=${authorizedShopId}`
                        : '/product/list',
                    )
                  }
                >
                  打开商品列表
                </Button>
                <Button
                  block
                  onClick={() =>
                    history.push(
                      authorizedShopId
                        ? `/order/all?shopId=${authorizedShopId}`
                        : '/order/all',
                    )
                  }
                >
                  打开订单列表
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </PageContainer>
  );
};

export default ShopAuthPage;
