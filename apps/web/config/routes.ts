/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        name: 'login',
        component: './user/login',
      },
      {
        path: '/user',
        redirect: '/user/login',
      },
      {
        name: 'register-result',
        icon: 'checkCircle',
        path: '/user/register-result',
        component: './user/register-result',
      },
      {
        name: 'register',
        icon: 'userAdd',
        path: '/user/register',
        component: './user/register',
      },
      {
        component: '404',
        path: '/user/*',
      },
    ],
  },
  {
    path: '/welcome',
    name: 'welcome',
    icon: 'home',
    component: './Welcome',
  },
  {
    path: '/admin',
    name: 'admin',
    icon: 'crown',
    access: 'canAdmin',
    routes: [
      {
        path: '/admin',
        redirect: '/admin/sub-page',
      },
      {
        path: '/admin/sub-page',
        name: 'sub-page',
        component: './Admin',
      },
    ],
  },
  {
    path: '/shop',
    name: 'shop',
    icon: 'shop',
    routes: [
      {
        path: '/shop',
        redirect: '/shop/list',
      },
      {
        path: '/shop/auth',
        name: 'shop-auth',
        component: './shop/auth',
      },
      {
        path: '/shop/list',
        name: 'shop-list',
        component: './shop/list',
      },
    ],
  },
  {
    path: '/product',
    name: 'product',
    icon: 'shopping',
    routes: [
      {
        path: '/product',
        redirect: '/product/list',
      },
      {
        path: '/product/list',
        name: 'product-list',
        component: './product/list',
      },
      {
        path: '/product/create',
        name: 'product-create',
        hideInMenu: true,
        component: './product/create',
      },
    ],
  },
  {
    path: '/reports',
    name: 'reports',
    icon: 'barChart',
    routes: [
      {
        path: '/reports',
        redirect: '/reports/metabase',
      },
      {
        path: '/reports/metabase',
        name: 'metabase-reports',
        component: './reports/metabase',
      },
    ],
  },
  {
    path: '/order',
    name: 'order',
    icon: 'profile',
    access: 'canOrderCenter',
    routes: [
      {
        path: '/order',
        redirect: '/order/pending',
      },
      {
        path: '/order/all',
        redirect: '/order/pending',
        hideInMenu: true,
      },
      {
        path: '/order/list',
        redirect: '/order/pending',
        hideInMenu: true,
      },
      {
        path: '/order/pending',
        name: 'pending-orders',
        component: './order/pending',
      },
      {
        path: '/order/pending-audit',
        name: 'pending-audit-orders',
        component: './order/pending-audit',
      },
      {
        path: '/order/pending-shipment',
        name: 'pending-shipment-orders',
        component: './order/pending-shipment',
      },
      {
        path: '/order/shipped',
        name: 'shipped-orders',
        component: './order/shipped',
      },
      {
        path: '/order/detail/:id',
        name: 'order-detail',
        hideInMenu: true,
        component: './order/detail',
      },
      {
        path: '/order/abnormal',
        name: 'abnormal-orders',
        component: './order/abnormal',
      },
      {
        path: '/order/after-sale',
        name: 'after-sale',
        component: './order/after-sale',
      },
      {
        path: '/order/cancel-refund',
        name: 'cancel-refund-orders',
        component: './order/cancel-refund',
      },
      {
        path: '/order/rules',
        name: 'order-rules',
        component: './order/rules',
      },
      {
        path: '/order/batch-print',
        name: 'batch-print',
        component: './order/batch-print',
      },
      {
        path: '/order/logistics',
        name: 'logistics-management',
        component: './order/logistics',
      },
      {
        path: '/order/package-precheck',
        name: 'package-precheck',
        component: './order/package-precheck',
      },
      {
        path: '/order/warehouse',
        name: 'warehouse-allocation',
        component: './order/warehouse',
      },
      {
        path: '/order/logs',
        name: 'order-logs',
        component: './order/logs',
      },
      {
        path: '/order/sync-logs',
        name: 'sync-logs',
        component: './order/sync-logs',
      },
    ],
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    icon: 'dashboard',
    routes: [
      {
        path: '/dashboard',
        redirect: '/shop/list',
      },
      {
        name: 'analysis',
        icon: 'barChart',
        path: '/dashboard/analysis',
        redirect: '/shop/list',
      },
      {
        name: 'monitor',
        icon: 'monitor',
        path: '/dashboard/monitor',
        redirect: '/shop/list',
      },
      {
        name: 'workplace',
        icon: 'desktop',
        path: '/dashboard/workplace',
        redirect: '/shop/list',
      },
    ],
  },
  {
    path: '/form',
    icon: 'form',
    name: 'form',
    routes: [
      {
        path: '/form',
        redirect: '/form/basic-form',
      },
      {
        name: 'basic-form',
        icon: 'form',
        path: '/form/basic-form',
        component: './form/basic-form',
      },
      {
        name: 'step-form',
        icon: 'orderedList',
        path: '/form/step-form',
        component: './form/step-form',
      },
      {
        name: 'advanced-form',
        icon: 'profile',
        path: '/form/advanced-form',
        component: './form/advanced-form',
      },
    ],
  },
  {
    path: '/list',
    icon: 'table',
    name: 'list',
    routes: [
      {
        path: '/list/search',
        name: 'search-list',
        component: './list/search',
        routes: [
          {
            path: '/list/search',
            redirect: '/list/search/articles',
          },
          {
            name: 'articles',
            icon: 'read',
            path: '/list/search/articles',
            component: './list/search/articles',
          },
          {
            name: 'projects',
            icon: 'project',
            path: '/list/search/projects',
            component: './list/search/projects',
          },
          {
            name: 'applications',
            icon: 'appstore',
            path: '/list/search/applications',
            component: './list/search/applications',
          },
        ],
      },
      {
        path: '/list',
        redirect: '/list/table-list',
      },
      {
        name: 'table-list',
        icon: 'table',
        path: '/list/table-list',
        component: './table-list',
      },
      {
        name: 'basic-list',
        icon: 'unorderedList',
        path: '/list/basic-list',
        component: './list/basic-list',
      },
      {
        name: 'card-list',
        icon: 'creditCard',
        path: '/list/card-list',
        component: './list/card-list',
      },
    ],
  },
  {
    path: '/profile',
    name: 'profile',
    icon: 'profile',
    routes: [
      {
        path: '/profile',
        redirect: '/profile/basic',
      },
      {
        name: 'basic',
        icon: 'idcard',
        path: '/profile/basic',
        component: './profile/basic',
      },
      {
        name: 'advanced',
        icon: 'crown',
        path: '/profile/advanced',
        component: './profile/advanced',
      },
    ],
  },
  {
    name: 'result',
    icon: 'checkCircle',
    path: '/result',
    routes: [
      {
        path: '/result',
        redirect: '/result/success',
      },
      {
        name: 'success',
        icon: 'checkCircle',
        path: '/result/success',
        component: './result/success',
      },
      {
        name: 'fail',
        icon: 'closeCircle',
        path: '/result/fail',
        component: './result/fail',
      },
    ],
  },
  {
    name: 'exception',
    icon: 'warning',
    path: '/exception',
    routes: [
      {
        path: '/exception',
        redirect: '/exception/403',
      },
      {
        name: '403',
        icon: 'stop',
        path: '/exception/403',
        component: './exception/403',
      },
      {
        name: '404',
        icon: 'warning',
        path: '/exception/404',
        component: './exception/404',
      },
      {
        name: '500',
        icon: 'bug',
        path: '/exception/500',
        component: './exception/500',
      },
    ],
  },
  {
    name: 'account',
    icon: 'user',
    path: '/account',
    routes: [
      {
        path: '/account',
        redirect: '/account/center',
      },
      {
        name: 'center',
        icon: 'user',
        path: '/account/center',
        component: './account/center',
      },
      {
        name: 'settings',
        icon: 'setting',
        path: '/account/settings',
        component: './account/settings',
      },
    ],
  },
  {
    path: '/knowledge',
    name: 'knowledge',
    icon: 'book',
    component: './knowledge',
  },
  {
    path: '/chatbot',
    name: 'chatbot',
    icon: 'robot',
    component: './chatbot',
  },
  {
    path: '/',
    redirect: '/shop/list',
  },
  {
    component: '404',
    path: './*',
  },
];
