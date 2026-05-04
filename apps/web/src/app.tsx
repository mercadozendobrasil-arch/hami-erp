import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React from 'react';
import {
  AvatarDropdown,
  AvatarName,
  Footer,
  Question,
  SelectLang,
} from '@/components';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import { currentUser } from '@/services/ant-design-pro/api';

dayjs.extend(relativeTime);

const isDev = process.env.NODE_ENV === 'development';
const isDevOrTest = isDev || process.env.CI;

export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  const fetchUserInfo = async () => {
    try {
      const response = await currentUser({ skipErrorHandler: true });
      return response.data;
    } catch {
      return undefined;
    }
  };

  const state = {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };

  if (history.location.pathname !== '/user/login') {
    const user = await fetchUserInfo();
    return {
      ...state,
      currentUser: user,
    };
  }

  return {
    ...state,
  };
}

export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    actionsRender: () => [
      <Question key="doc" />,
      <SelectLang key="SelectLang" />,
    ],
    menuItemRender: (item, dom) => {
      if (item.path) {
        return (
          <Link to={item.path} prefetch>
            {dom}
          </Link>
        );
      }
      return dom;
    },
    avatarProps: initialState?.currentUser?.name
      ? {
          src: initialState.currentUser.avatar,
          title: <AvatarName />,
          render: (_, avatarChildren) => (
            <AvatarDropdown>{avatarChildren}</AvatarDropdown>
          ),
        }
      : undefined,
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      if (!initialState?.currentUser && location.pathname !== '/user/login') {
        history.replace({
          pathname: '/user/login',
          search: new URLSearchParams({
            redirect: location.pathname + location.search,
          }).toString(),
        });
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDev
      ? [
          <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
            <LinkOutlined />
            <span>OpenAPI 文档</span>
          </Link>,
        ]
      : [],
    menuHeaderRender: undefined,
    childrenRender: (children) => {
      return (
        <>
          {children}
          {isDevOrTest && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </>
      );
    },
    ...initialState?.settings,
  };
};

export const request: RequestConfig = {
  // ERP API uses the same /api prefix in development and production-facing requests.
  // In development, Umi proxy forwards /api to the isolated NestJS service.
  baseURL: '',
  ...errorConfig,
};
