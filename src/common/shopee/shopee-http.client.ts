import { createHmac } from 'node:crypto';

import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ShopeeEnvironmentResolver } from '../shopee-environment.resolver';
import { SHOPEE_API_DEFAULT_VERSION } from '../constants/shopee.constants';
import { compactObject } from '../utils/object.util';
import { ShopeeApiEnvelope, ShopeeRequestOptions } from './shopee.types';

@Injectable()
export class ShopeeHttpClient {
  private readonly logger = new Logger(ShopeeHttpClient.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly shopeeEnvironmentResolver: ShopeeEnvironmentResolver,
  ) {}

  async request<TResponse, TBody = unknown>(
    options: ShopeeRequestOptions<TBody>,
  ): Promise<TResponse> {
    const timestamp = Math.floor(Date.now() / 1000);
    const shopeeConfig = this.shopeeEnvironmentResolver.getCurrentConfig();
    const host = shopeeConfig.baseUrl;
    const version = this.configService.get<string>(
      'SHOPEE_API_VERSION',
      SHOPEE_API_DEFAULT_VERSION,
    );
    const normalizedPath = options.path.startsWith('/api/')
      ? options.path
      : `/api/${version}${options.path.startsWith('/') ? options.path : `/${options.path}`}`;
    const url = new URL(`${host}${normalizedPath}`);

    const partnerId = String(shopeeConfig.partnerId);
    const partnerKey = shopeeConfig.partnerKey;

    if (!partnerId || !partnerKey) {
      throw new InternalServerErrorException(
        'Shopee credentials are not configured.',
      );
    }

    const query = compactObject({
      partner_id: partnerId,
      timestamp,
      sign: this.sign({
        partnerId,
        partnerKey,
        path: normalizedPath,
        timestamp,
        accessToken: options.accessToken,
        shopId: options.shopId,
      }),
      access_token: options.accessToken,
      shop_id: options.shopId,
      ...options.query,
    });

    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }

    const headers = new Headers();
    let body: BodyInit | undefined;

    if (
      options.body !== undefined &&
      options.contentType !== 'multipart/form-data'
    ) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(compactObject(options.body));
    }

    if (
      options.body !== undefined &&
      options.contentType === 'multipart/form-data'
    ) {
      body = this.toFormData(options.body);
    }

    const response = await fetch(url, {
      method: options.method,
      headers,
      body,
    });

    const payload = (await response.json()) as ShopeeApiEnvelope<TResponse>;

    if (!response.ok || payload.error) {
      this.logger.error(
        `Shopee request failed: ${options.method} ${normalizedPath}`,
        JSON.stringify({
          status: response.status,
          requestId: payload.request_id,
          error: payload.error,
          message: payload.message,
        }),
      );

      throw new BadGatewayException({
        statusCode: response.status,
        path: normalizedPath,
        requestId: payload.request_id,
        error: payload.error ?? 'shopee_request_failed',
        message: payload.message ?? 'Shopee request failed',
      });
    }

    return payload.response ?? (payload as TResponse);
  }

  private sign(params: {
    partnerId: string;
    partnerKey: string;
    path: string;
    timestamp: number;
    accessToken?: string;
    shopId?: number;
  }) {
    const baseString = [
      params.partnerId,
      params.path,
      params.timestamp,
      params.accessToken,
      params.shopId,
    ]
      .filter((value) => value !== undefined)
      .join('');

    return createHmac('sha256', params.partnerKey)
      .update(baseString)
      .digest('hex');
  }

  private toFormData(payload: unknown): FormData {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload)
    ) {
      throw new InternalServerErrorException(
        'Multipart payload must be an object.',
      );
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
}
