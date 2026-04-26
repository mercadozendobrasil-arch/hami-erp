/**
 * Local API proxy configuration.
 * `dev` points the Ant Design Pro frontend to the isolated NestJS ERP API.
 * Override with ERP_API_BASE_URL when the API runs on another host/port.
 */
const erpApiBaseUrl = process.env.ERP_API_BASE_URL || 'http://localhost:3001';

export default {
  dev: {
    '/api': {
      target: erpApiBaseUrl,
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
