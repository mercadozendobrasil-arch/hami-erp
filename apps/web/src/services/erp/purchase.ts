import { request } from '@umijs/max';

export async function querySuppliers(params?: ERP.SupplierQueryParams) {
  return request<API.ListResponse<ERP.SupplierListItem>>(
    '/api/erp/purchases/suppliers',
    {
      method: 'GET',
      params,
    },
  );
}

export async function createSupplier(payload: ERP.SupplierSavePayload) {
  return request<ERP.ApiResponse<ERP.SupplierListItem>>(
    '/api/erp/purchases/suppliers',
    {
      method: 'POST',
      data: payload,
    },
  );
}

export async function queryPurchaseOrders(params: ERP.PurchaseOrderQueryParams) {
  return request<API.ListResponse<ERP.PurchaseOrderListItem>>(
    '/api/erp/purchases/orders',
    {
      method: 'GET',
      params,
    },
  );
}

export async function createPurchaseOrder(payload: ERP.PurchaseOrderSavePayload) {
  return request<ERP.ApiResponse<ERP.PurchaseOrderListItem>>(
    '/api/erp/purchases/orders',
    {
      method: 'POST',
      data: payload,
    },
  );
}

export async function getPurchaseOrder(orderId: string) {
  return request<ERP.ApiResponse<ERP.PurchaseOrderDetail>>(
    `/api/erp/purchases/orders/${orderId}`,
    {
      method: 'GET',
    },
  );
}

export async function receivePurchaseOrder(
  orderId: string,
  payload: ERP.PurchaseReceivePayload,
) {
  return request<ERP.ApiResponse<ERP.PurchaseOrderListItem>>(
    `/api/erp/purchases/orders/${orderId}/receive`,
    {
      method: 'POST',
      data: payload,
    },
  );
}
