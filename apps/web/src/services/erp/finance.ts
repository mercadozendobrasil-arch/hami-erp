import { request } from '@umijs/max';

export async function queryFinanceSummary(params: ERP.FinanceQueryParams) {
  return request<ERP.ApiResponse<ERP.FinanceSummary>>('/api/erp/finance/summary', {
    method: 'GET',
    params,
  });
}

export async function queryOrderProfits(params: ERP.FinanceQueryParams) {
  return request<API.ListResponse<ERP.OrderProfitItem>>(
    '/api/erp/finance/order-profits',
    {
      method: 'GET',
      params,
    },
  );
}

export async function rebuildOrderProfits(payload: ERP.FinanceRebuildPayload) {
  return request<ERP.ApiResponse<{ totalCount: number; successCount: number }>>(
    '/api/erp/finance/order-profits/rebuild',
    {
      method: 'POST',
      data: payload,
    },
  );
}
