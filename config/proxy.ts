/**
 * Local API proxy configuration.
 * `dev` points the Ant Design Pro frontend to the isolated NestJS ERP API.
 */
export default {
  dev: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
  test: {
    '/api': {
      target: 'https://pro-api.ant-design-demo.workers.dev',
      changeOrigin: true,
    },
  },
  pre: {
    '/api': {
      target: 'your pre url',
      changeOrigin: true,
    },
  },
};
