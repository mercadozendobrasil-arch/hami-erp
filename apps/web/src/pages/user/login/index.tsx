import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormCheckbox, ProFormText } from '@ant-design/pro-components';
import { Helmet, useModel } from '@umijs/max';
import { Alert, App } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';

import { Footer } from '@/components';
import { login } from '@/services/ant-design-pro/api';
import Settings from '../../../../config/defaultSettings';

const useStyles = createStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    overflow: 'auto',
    background: '#f5f7fb',
  },
  panel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
  },
}));

const LoginMessage: React.FC<{ content: string }> = ({ content }) => (
  <Alert style={{ marginBottom: 24 }} title={content} type="error" showIcon />
);

const getSafeRedirectUrl = (redirect: string | null) => {
  if (!redirect?.startsWith('/') || redirect.startsWith('//')) return '/';
  try {
    const parsed = new URL(redirect, window.location.origin);
    return parsed.origin === window.location.origin
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : '/';
  } catch {
    return '/';
  }
};

const Login: React.FC = () => {
  const [loginError, setLoginError] = useState('');
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      flushSync(() => {
        setInitialState((state) => ({
          ...state,
          currentUser: userInfo,
        }));
      });
    }
  };

  const handleSubmit = async (values: API.LoginParams) => {
    setLoginError('');
    try {
      const result = await login(values);
      if (result.status === 'ok') {
        message.success('登录成功');
        await fetchUserInfo();
        const redirectUrl = getSafeRedirectUrl(
          new URL(window.location.href).searchParams.get('redirect'),
        );
        window.location.href = redirectUrl;
        return;
      }
      setLoginError('账号或密码错误');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '登录失败，请重试');
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>内部登录{Settings.title ? ` - ${Settings.title}` : ''}</title>
      </Helmet>
      <div className={styles.panel}>
        <LoginForm
          contentStyle={{ minWidth: 300, maxWidth: 360 }}
          logo={<img alt="logo" src="/logo.svg" />}
          title="Hami ERP"
          subTitle="公司内部系统"
          initialValues={{ autoLogin: true }}
          onFinish={async (values) => handleSubmit(values as API.LoginParams)}
        >
          {loginError ? <LoginMessage content={loginError} /> : null}
          <ProFormText
            name="username"
            fieldProps={{
              size: 'large',
              prefix: <UserOutlined />,
            }}
            placeholder="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined />,
            }}
            placeholder="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          />
          <ProFormCheckbox noStyle name="autoLogin">
            保持登录
          </ProFormCheckbox>
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
