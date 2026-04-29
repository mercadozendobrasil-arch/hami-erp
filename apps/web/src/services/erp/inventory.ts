import { request } from '@umijs/max';

export async function queryWarehouses() {
  return request<API.ListResponse<ERP.WarehouseListItem>>(
    '/api/erp/inventory/warehouses',
    {
      method: 'GET',
    },
  );
}

export async function createWarehouse(payload: ERP.WarehouseSavePayload) {
  return request<ERP.ApiResponse<ERP.WarehouseListItem>>(
    '/api/erp/inventory/warehouses',
    {
      method: 'POST',
      data: payload,
    },
  );
}

export async function queryInventoryBalances(params: ERP.InventoryQueryParams) {
  return request<API.ListResponse<ERP.InventoryBalanceItem>>(
    '/api/erp/inventory/balances',
    {
      method: 'GET',
      params,
    },
  );
}

export async function adjustInventory(payload: ERP.InventoryAdjustPayload) {
  return request<ERP.ApiResponse<ERP.InventoryBalanceItem>>(
    '/api/erp/inventory/adjustments',
    {
      method: 'POST',
      data: payload,
    },
  );
}

export async function reserveInventory(payload: ERP.InventoryReservePayload) {
  return request<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/erp/inventory/reservations',
    {
      method: 'POST',
      data: payload,
    },
  );
}

export async function releaseInventoryReservation(
  payload: ERP.InventoryReleasePayload,
) {
  return request<ERP.ApiResponse<Record<string, unknown>>>(
    '/api/erp/inventory/reservations/release',
    {
      method: 'POST',
      data: payload,
    },
  );
}
