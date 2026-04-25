/**
 * @name 简单版路由配置
 * @description 此配置用于 npm run simple 命令执行后使用
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './user/login',
      },
    ],
  },
  {
    path: '/welcome',
    name: 'welcome',
    icon: 'smile',
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
    ],
  },
  {
    path: '/order',
    name: 'order',
    icon: 'profile',
    routes: [
      {
        path: '/order',
        redirect: '/order/list',
      },
      {
        path: '/order/list',
        name: 'order-list',
        component: './order/list',
      },
    ],
  },
  {
    name: 'list.table-list',
    icon: 'table',
    path: '/list',
    component: './table-list',
  },
  {
    path: '/',
    redirect: '/shop/list',
  },
  {
    component: '404',
    layout: false,
    path: './*',
  },
];
