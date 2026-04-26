import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import { ShopeeErrorMapper } from './shopee-error.mapper';
import { ShopeeSignature } from './shopee-signature';
import {
  SHOPEE_API_LOGGER,
  SHOPEE_SDK_OPTIONS,
  type ShopeeApiEnvelope,
  type ShopeeApiLogger,
  type ShopeeApiResponse,
  type ShopeeHttpHook,
  type ShopeeHttpHookContext,
  type ShopeeQueryValue,
  type ShopeeRequestOptions,
  type ShopeeRetryOptions,
  type ShopeeSdkConfig,
  ShopeeSdkError,
} from './sdk.types';

@Injectable()
export class ShopeeHttpService {
  private readonly hooks: ShopeeHttpHook[];
  private readonly fetchImpl: typeof fetch;
  private readonly rateLimiter = new ShopeeRateLimiter();

  constructor(
    @Inject(SHOPEE_SDK_OPTIONS)
    private readonly config: ShopeeSdkConfig,
    @Inject(SHOPEE_API_LOGGER)
    private readonly apiLogger: ShopeeApiLogger,
    private readonly signature: ShopeeSignature,
    private readonly errorMapper: ShopeeErrorMapper,
  ) {
    this.fetchImpl = this.config.fetchImpl ?? fetch;
    this.hooks = [
      this.createRetryHook(),
      this.createRateLimitHook(),
      this.createTimeoutHook(),
    ];
  }

  async request<TResponse, TBody = unknown>(
    request: ShopeeRequestOptions<TBody>,
  ): Promise<ShopeeApiResponse<TResponse>> {
    const context: ShopeeHttpHookContext = {
      attempt: 1,
      timeoutMs: request.timeoutMs ?? this.config.timeoutMs,
      request,
      metadata: {
        operationId: randomUUID(),
      },
      sdkConfig: this.config,
    };

    return this.executeHooks(context, 0, () =>
      this.dispatchRequest<TResponse, TBody>(context, request),
    );
  }

  async download<TBody = unknown>(
    request: ShopeeRequestOptions<TBody>,
  ): Promise<Buffer> {
    const timestamp = request.timestamp ?? this.signature.getTimestamp();
    const url = this.buildSignedUrl(request, timestamp);
    const { signal, cleanup } = this.createAbortSignal(
      request.signal,
      request.timeoutMs ?? this.config.timeoutMs,
    );
    const init = this.buildFetchInit(request, signal);

    try {
      const response = await this.fetchImpl(url, init);
      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        const responseBody = await response.text();
        const payload = this.parsePayload<unknown>(responseBody);

        if (!response.ok) {
          throw this.errorMapper.mapHttpError(
            response.status,
            payload,
            responseBody,
          );
        }

        if (payload.error) {
          throw this.errorMapper.mapApiError(payload, response.status);
        }

        return Buffer.from(JSON.stringify(payload));
      }

      if (!response.ok) {
        throw this.errorMapper.mapHttpError(response.status);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      throw this.errorMapper.mapUnknown(error);
    } finally {
      cleanup();
    }
  }

  private async executeHooks<T>(
    context: ShopeeHttpHookContext,
    index: number,
    terminal: () => Promise<T>,
  ): Promise<T> {
    const hook = this.hooks[index];

    if (!hook) {
      return terminal();
    }

    return hook.handle(context, () =>
      this.executeHooks(context, index + 1, terminal),
    );
  }

  private async dispatchRequest<TResponse, TBody>(
    context: ShopeeHttpHookContext,
    request: ShopeeRequestOptions<TBody>,
  ): Promise<ShopeeApiResponse<TResponse>> {
    const timestamp = request.timestamp ?? this.signature.getTimestamp();
    const url = this.buildSignedUrl(request, timestamp);
    const { signal, cleanup } = this.createAbortSignal(
      request.signal,
      context.timeoutMs,
    );
    const init = this.buildFetchInit(request, signal);
    const startedAt = Date.now();

    try {
      const response = await this.fetchImpl(url, init);
      const responseBody = await response.text();
      const payload = this.parsePayload<TResponse>(responseBody);

      if (!response.ok) {
        throw this.errorMapper.mapHttpError(
          response.status,
          payload,
          responseBody,
        );
      }

      if (payload.error) {
        throw this.errorMapper.mapApiError(payload, response.status);
      }

      if (payload.response === undefined) {
        throw new ShopeeSdkError({
          code: 'INVALID_RESPONSE',
          message: 'Shopee API response is missing the response payload',
          retryable: false,
          statusCode: response.status,
          requestId: payload.request_id,
          details: payload,
        });
      }

      const normalized: ShopeeApiResponse<TResponse> = {
        ok: true,
        data: payload.response,
        statusCode: response.status,
        requestId: payload.request_id ?? null,
        warning: payload.warning ?? null,
        headers: this.readHeaders(response.headers),
        raw: payload,
      };

      await this.logRequest({
        ok: true,
        attempt: context.attempt,
        durationMs: Date.now() - startedAt,
        method: request.method ?? 'POST',
        path: request.path,
        url,
        statusCode: response.status,
        requestId: payload.request_id ?? null,
      });

      return normalized;
    } catch (error) {
      const mappedError = this.errorMapper.mapUnknown(error);

      await this.logRequest({
        ok: false,
        attempt: context.attempt,
        durationMs: Date.now() - startedAt,
        method: request.method ?? 'POST',
        path: request.path,
        url,
        statusCode: mappedError.statusCode,
        requestId: mappedError.requestId ?? null,
        errorCode: mappedError.code,
        errorMessage: mappedError.message,
      });

      throw mappedError;
    } finally {
      cleanup();
    }
  }

  private buildSignedUrl<TBody>(
    request: ShopeeRequestOptions<TBody>,
    timestamp: number,
  ): string {
    const url = new URL(request.path, this.config.baseUrl);
    const query = new URLSearchParams();

    this.appendQueryValues(query, request.query);
    query.set('partner_id', String(this.config.partnerId));
    query.set('timestamp', String(timestamp));

    if (request.accessToken) {
      query.set('access_token', request.accessToken);
    }

    if (request.shopId !== undefined) {
      query.set('shop_id', String(request.shopId));
    }

    if (request.merchantId !== undefined) {
      query.set('merchant_id', String(request.merchantId));
    }

    query.set(
      'sign',
      this.signature.signRequest({
        path: request.path,
        timestamp,
        accessToken: request.accessToken,
        shopId: request.shopId,
        merchantId: request.merchantId,
      }),
    );

    url.search = query.toString();
    return url.toString();
  }

  private buildFetchInit<TBody>(
    request: ShopeeRequestOptions<TBody>,
    signal: AbortSignal,
  ): RequestInit {
    const headers = new Headers(request.headers ?? {});

    if (
      request.contentType !== 'multipart/form-data' &&
      !headers.has('content-type')
    ) {
      headers.set('content-type', 'application/json');
    }

    if (!headers.has('accept')) {
      headers.set('accept', 'application/json');
    }

    const body =
      request.body === undefined
        ? undefined
        : request.contentType === 'multipart/form-data'
          ? this.toFormData(request.body)
          : JSON.stringify(request.body);

    return {
      method: request.method ?? 'POST',
      headers,
      body,
      signal,
    };
  }

  private toFormData(payload: unknown): FormData {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ShopeeSdkError({
        code: 'INVALID_MULTIPART_PAYLOAD',
        message: 'Shopee multipart payload must be an object',
        retryable: false,
        details: payload,
      });
    }

    const formData = new FormData();

    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (value instanceof Blob) {
        formData.append(key, value);
        continue;
      }

      if (value instanceof Buffer || value instanceof Uint8Array) {
        formData.append(key, new Blob([new Uint8Array(value)]));
        continue;
      }

      formData.append(
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      );
    }

    return formData;
  }

  private parsePayload<TResponse>(
    responseBody: string,
  ): ShopeeApiEnvelope<TResponse> {
    if (!responseBody.trim()) {
      return {};
    }

    try {
      return JSON.parse(responseBody) as ShopeeApiEnvelope<TResponse>;
    } catch (error) {
      throw new ShopeeSdkError({
        code: 'INVALID_JSON_RESPONSE',
        message: 'Shopee API returned a non-JSON response',
        retryable: false,
        details: responseBody,
        cause: error,
      });
    }
  }

  private appendQueryValues(
    searchParams: URLSearchParams,
    query?: Record<string, ShopeeQueryValue>,
  ): void {
    if (!query) {
      return;
    }

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }

      searchParams.set(key, String(value));
    }
  }

  private readHeaders(headers: Headers): Record<string, string> {
    return Object.fromEntries(headers.entries());
  }

  private createAbortSignal(
    upstreamSignal: AbortSignal | undefined,
    timeoutMs: number,
  ): {
    signal: AbortSignal;
    cleanup: () => void;
  } {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    const abortListener = () => abortController.abort();

    if (upstreamSignal) {
      if (upstreamSignal.aborted) {
        abortController.abort();
      } else {
        upstreamSignal.addEventListener('abort', abortListener, {
          once: true,
        });
      }
    }

    return {
      signal: abortController.signal,
      cleanup: () => {
        clearTimeout(timeoutId);

        if (upstreamSignal) {
          upstreamSignal.removeEventListener('abort', abortListener);
        }
      },
    };
  }

  private createTimeoutHook(): ShopeeHttpHook {
    return {
      name: 'timeout',
      handle: async <T>(
        context: ShopeeHttpHookContext,
        next: () => Promise<T>,
      ): Promise<T> => {
        context.timeoutMs =
          context.request.timeoutMs ?? context.sdkConfig.timeoutMs;
        return next();
      },
    };
  }

  private createRetryHook(): ShopeeHttpHook {
    return {
      name: 'retry',
      handle: async <T>(
        context: ShopeeHttpHookContext,
        next: () => Promise<T>,
      ): Promise<T> => {
        const retryOptions = this.resolveRetryOptions(context.request.retry);
        let lastError: ShopeeSdkError | undefined;

        for (
          let attempt = 1;
          attempt <= retryOptions.maxAttempts;
          attempt += 1
        ) {
          context.attempt = attempt;

          try {
            return await next();
          } catch (error) {
            lastError = this.errorMapper.mapUnknown(error);

            if (
              attempt >= retryOptions.maxAttempts ||
              !this.errorMapper.isRetryable(lastError)
            ) {
              throw lastError;
            }

            await this.sleep(this.getRetryDelay(attempt, retryOptions));
          }
        }

        throw (
          lastError ??
          new ShopeeSdkError({
            code: 'RETRY_EXHAUSTED',
            message: 'Shopee HTTP retry exhausted',
            retryable: false,
          })
        );
      },
    };
  }

  private createRateLimitHook(): ShopeeHttpHook {
    return {
      name: 'rate-limit',
      handle: async <T>(
        context: ShopeeHttpHookContext,
        next: () => Promise<T>,
      ): Promise<T> => {
        const minIntervalMs = Math.max(
          0,
          context.sdkConfig.rateLimit.minIntervalMs,
        );
        await this.rateLimiter.wait(minIntervalMs);
        return next();
      },
    };
  }

  private resolveRetryOptions(
    retryOverrides?: Partial<ShopeeRetryOptions>,
  ): ShopeeRetryOptions {
    return {
      maxAttempts: Math.max(
        1,
        retryOverrides?.maxAttempts ?? this.config.retry.maxAttempts,
      ),
      baseDelayMs: Math.max(
        0,
        retryOverrides?.baseDelayMs ?? this.config.retry.baseDelayMs,
      ),
      maxDelayMs: Math.max(
        retryOverrides?.baseDelayMs ?? this.config.retry.baseDelayMs,
        retryOverrides?.maxDelayMs ?? this.config.retry.maxDelayMs,
      ),
    };
  }

  private getRetryDelay(
    attempt: number,
    retryOptions: ShopeeRetryOptions,
  ): number {
    const exponentialDelay = retryOptions.baseDelayMs * 2 ** (attempt - 1);
    return Math.min(exponentialDelay, retryOptions.maxDelayMs);
  }

  private sleep(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }

  private async logRequest(entry: Parameters<ShopeeApiLogger['log']>[0]) {
    await this.apiLogger.log(entry);
  }
}

class ShopeeRateLimiter {
  private nextAvailableAt = 0;
  private queue = Promise.resolve();

  async wait(minIntervalMs: number): Promise<void> {
    const scheduled = this.queue.then(async () => {
      const now = Date.now();
      const waitMs = Math.max(0, this.nextAvailableAt - now);

      if (waitMs > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, waitMs);
        });
      }

      this.nextAvailableAt = Date.now() + minIntervalMs;
    });

    this.queue = scheduled.catch(() => undefined);
    await scheduled;
  }
}
