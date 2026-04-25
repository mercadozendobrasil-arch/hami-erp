import { Injectable } from '@nestjs/common';

import { ShopeeApiEnvelope, ShopeeSdkError } from './sdk.types';

@Injectable()
export class ShopeeErrorMapper {
  mapApiError(
    payload: ShopeeApiEnvelope<unknown>,
    statusCode?: number,
  ): ShopeeSdkError {
    const errorCode = payload.error?.trim() || 'SHOPEE_API_ERROR';
    const message = payload.message?.trim() || 'Shopee API request failed';

    return new ShopeeSdkError({
      code: errorCode,
      message,
      retryable: this.isRetryableShopeeError(errorCode),
      statusCode,
      requestId: payload.request_id,
      details: payload,
    });
  }

  mapHttpError(
    statusCode: number,
    payload?: ShopeeApiEnvelope<unknown>,
    responseBody?: string,
  ): ShopeeSdkError {
    if (payload?.error || payload?.message) {
      return this.mapApiError(payload, statusCode);
    }

    return new ShopeeSdkError({
      code: `HTTP_${statusCode}`,
      message: `Shopee HTTP request failed with status ${statusCode}`,
      retryable: this.isRetryableHttpStatus(statusCode),
      statusCode,
      requestId: payload?.request_id,
      details: responseBody,
    });
  }

  mapUnknown(error: unknown): ShopeeSdkError {
    if (error instanceof ShopeeSdkError) {
      return error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return new ShopeeSdkError({
        code: 'REQUEST_TIMEOUT',
        message: 'Shopee HTTP request timed out',
        retryable: true,
        cause: error,
      });
    }

    if (error instanceof Error) {
      return new ShopeeSdkError({
        code: 'HTTP_CLIENT_ERROR',
        message: error.message || 'Shopee HTTP client request failed',
        retryable: true,
        cause: error,
      });
    }

    return new ShopeeSdkError({
      code: 'UNKNOWN_ERROR',
      message: 'Unknown Shopee SDK error',
      retryable: false,
      details: error,
    });
  }

  isRetryable(error: unknown): boolean {
    return this.mapUnknown(error).retryable;
  }

  private isRetryableShopeeError(code: string): boolean {
    const normalized = code.toUpperCase();

    return (
      normalized.includes('TIMEOUT') ||
      normalized.includes('SYSTEM_BUSY') ||
      normalized.includes('SYSTEM_ERROR') ||
      normalized.includes('INTERNAL_ERROR') ||
      normalized.includes('TOO_MANY_REQUEST')
    );
  }

  private isRetryableHttpStatus(statusCode: number): boolean {
    return statusCode === 408 || statusCode === 429 || statusCode >= 500;
  }
}
