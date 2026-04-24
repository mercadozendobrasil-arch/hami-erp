export interface ShopeeApiEnvelope<TResponse> {
  error?: string;
  message?: string;
  request_id?: string;
  response?: TResponse;
  warning?: string;
}

export interface ShopeeOrderListParams {
  timeRangeField?: string;
  timeFrom?: number;
  timeTo?: number;
  pageSize?: number;
  cursor?: string;
  orderStatus?: string;
  responseOptionalFields?: string;
}

export interface ParsedWebhookEvent {
  eventId: string | null;
  topic: string;
  shopId: string | null;
  payload: Record<string, unknown>;
}
