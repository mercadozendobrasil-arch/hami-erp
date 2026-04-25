import { request } from '@umijs/max';

export async function querySyncLogs(params: ERP.ShopeeSyncLogQueryParams & { type?: string }) {
  return request<API.ListResponse<ERP.ShopeeSyncLogItem>>('/api/erp/sync-logs', {
    method: 'GET',
    params,
  });
}
