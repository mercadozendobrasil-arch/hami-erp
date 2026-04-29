import { request } from '@umijs/max';

export async function querySystemPermissions() {
  return request<API.ListResponse<ERP.SystemPermissionItem>>(
    '/api/erp/system/permissions',
    { method: 'GET' },
  );
}

export async function querySystemRoles(params: ERP.SystemPageParams) {
  return request<API.ListResponse<ERP.SystemRoleItem>>(
    '/api/erp/system/roles',
    { method: 'GET', params },
  );
}

export async function saveSystemRole(payload: ERP.SystemRoleSavePayload) {
  return request<ERP.ApiResponse<ERP.SystemRoleItem>>('/api/erp/system/roles', {
    method: 'POST',
    data: payload,
  });
}

export async function querySystemUsers(params: ERP.SystemPageParams) {
  return request<API.ListResponse<ERP.SystemUserItem>>(
    '/api/erp/system/users',
    { method: 'GET', params },
  );
}

export async function saveSystemUser(payload: ERP.SystemUserSavePayload) {
  return request<ERP.ApiResponse<ERP.SystemUserItem>>('/api/erp/system/users', {
    method: 'POST',
    data: payload,
  });
}

export async function queryOperationLogs(params: ERP.OperationLogQueryParams) {
  return request<API.ListResponse<ERP.OperationLogItem>>(
    '/api/erp/system/operation-logs',
    { method: 'GET', params },
  );
}

export async function queryTaskLogs(params: ERP.TaskLogQueryParams) {
  return request<API.ListResponse<ERP.TaskLogItem>>(
    '/api/erp/system/task-logs',
    { method: 'GET', params },
  );
}
