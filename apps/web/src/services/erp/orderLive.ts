import { request } from '@umijs/max';

export type LiveFulfillmentStage =
  | 'pending_invoice'
  | 'pending_shipment'
  | 'pending_print'
  | 'pending_pickup'
  | 'shipped'
  | 'cancelled';

export type LiveOrderStatusCounts = {
  pendingInvoice: number;
  pendingShipment: number;
  pendingPrint: number;
  pendingPickup: number;
  shipped: number;
  cancelled: number;
  total: number;
};

export type LiveErpJobRecord = {
  id: string;
  queueName: string;
  jobName: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LivePrintLabelTaskPayload = {
  shopId: string;
  orders: Array<{
    orderSn: string;
    packageNumber?: string;
    shippingDocumentType?: string;
  }>;
};

export type LivePickupPayload = {
  shopId: string;
  packageNumber?: string;
  pickup?: {
    addressId?: number;
    pickupTimeId?: string;
    trackingNumber?: string;
  };
  dropoff?: {
    branchId?: number;
    senderRealName?: string;
    trackingNumber?: string;
  };
  nonIntegrated?: {
    trackingNumber?: string;
  };
};

export type LiveBatchPickupPayload = {
  shopId: string;
  orders: Array<
    Omit<LivePickupPayload, 'shopId'> & {
      orderSn: string;
    }
  >;
};

export async function queryLiveOrderStatusCounts(params: { shopId?: string }) {
  return request<ERP.ApiResponse<LiveOrderStatusCounts>>('/api/erp/orders/status-counts', {
    method: 'GET',
    params,
  });
}

export async function queryLiveOrders(
  params: ERP.OrderQueryParams & { fulfillmentStage?: LiveFulfillmentStage },
) {
  return request<API.ListResponse<ERP.OrderListItem>>('/api/erp/orders', {
    method: 'GET',
    params,
  });
}

export async function createLivePrintLabelTask(payload: LivePrintLabelTaskPayload) {
  return request<
    ERP.ApiResponse<{
      jobId: string;
      labelIds: string[];
      result?: Record<string, unknown>;
    }>
  >('/api/erp/orders/labels/print-task', {
    method: 'POST',
    data: payload,
  });
}

function resolveErpAuthHeaders() {
  const token = process.env.UMI_APP_ERP_API_TOKEN;

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;
}

function resolveFilenameFromDisposition(headerValue: string | null, fallback: string) {
  if (!headerValue) {
    return fallback;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = headerValue.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1] || fallback;
}

export async function downloadLiveLabel(labelId: string) {
  const response = await fetch(`/api/erp/orders/labels/${labelId}/download`, {
    method: 'GET',
    headers: resolveErpAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`下载面单失败，状态码 ${response.status}`);
  }

  const blob = await response.blob();
  const filename = resolveFilenameFromDisposition(
    response.headers.get('content-disposition'),
    `shipping-label-${labelId}.pdf`,
  );
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export function getLiveLabelDownloadUrl(labelId?: string) {
  return labelId ? `/api/erp/orders/labels/${labelId}/download` : '';
}

export async function markLiveOrderReadyForPickup(
  orderSn: string,
  payload: LivePickupPayload,
) {
  return request<ERP.ApiResponse<Record<string, unknown>>>(
    `/api/erp/orders/${orderSn}/mark-ready-for-pickup`,
    {
      method: 'POST',
      data: payload,
    },
  );
}

export async function batchMarkLiveOrdersReadyForPickup(payload: LiveBatchPickupPayload) {
  return request<
    ERP.ApiResponse<{
      successList: Array<{ orderSn: string; result: unknown }>;
      failList: Array<{ orderSn: string; errorMessage: string }>;
    }>
  >('/api/erp/orders/batch-mark-ready-for-pickup', {
    method: 'POST',
    data: payload,
  });
}

export async function getLiveErpJob(jobId: string) {
  return request<ERP.ApiResponse<LiveErpJobRecord>>(`/api/erp/jobs/${jobId}`, {
    method: 'GET',
  });
}

export async function queryLiveErpJobs(params?: { domain?: 'orders' | 'products' }) {
  return request<API.ListResponse<LiveErpJobRecord>>('/api/erp/jobs', {
    method: 'GET',
    params,
  });
}
