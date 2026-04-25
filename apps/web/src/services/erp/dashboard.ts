import { request } from '@umijs/max';

export async function queryDashboardSummary() {
  return request<
    ERP.ApiResponse<{
      shopCount: number;
      productCount: number;
      orderCount: number;
      todayOrderCount: number;
      todaySalesAmount: string;
    }>
  >('/api/erp/dashboard/summary', {
    method: 'GET',
  });
}

