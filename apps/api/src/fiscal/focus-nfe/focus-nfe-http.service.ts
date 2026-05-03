import { Injectable, InternalServerErrorException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  FocusNfeError,
  type FocusNfeEnvironment,
  type FocusNfeRequestOptions,
} from './focus-nfe.types';

@Injectable()
export class FocusNfeHttpService {
  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly injectedFetchImpl?: typeof fetch,
  ) {}

  async get<TResponse>(
    path: string,
    query?: FocusNfeRequestOptions['query'],
  ): Promise<TResponse> {
    return this.request<TResponse>({ method: 'GET', path, query });
  }

  async post<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    query?: FocusNfeRequestOptions['query'],
  ): Promise<TResponse> {
    return this.request<TResponse>({ method: 'POST', path, body, query });
  }

  async request<TResponse, TBody = unknown>(
    options: FocusNfeRequestOptions<TBody>,
  ): Promise<TResponse> {
    const response = await this.dispatch(options);
    const text = await response.text();
    const payload = text ? this.parseJson<TResponse>(text) : ({} as TResponse);

    if (!response.ok) {
      throw new FocusNfeError(
        `Focus NFe request failed with status ${response.status}.`,
        response.status,
        payload,
      );
    }

    return payload;
  }

  async download(path: string, query?: FocusNfeRequestOptions['query']): Promise<Buffer> {
    const response = await this.dispatch({ method: 'GET', path, query });

    if (!response.ok) {
      const text = await response.text();
      throw new FocusNfeError(
        `Focus NFe download failed with status ${response.status}.`,
        response.status,
        text,
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }

  getEnvironment(): FocusNfeEnvironment {
    const env = this.configService.get<string>('FOCUS_NFE_ENV', 'homologation');
    if (env === 'production') return 'production';
    if (env === 'homologation' || env === 'sandbox') return 'homologation';
    throw new InternalServerErrorException(
      `Invalid FOCUS_NFE_ENV "${env}". Expected "homologation" or "production".`,
    );
  }

  getBaseUrl(): string {
    const env = this.getEnvironment();
    const key =
      env === 'production'
        ? 'FOCUS_NFE_PROD_BASE_URL'
        : 'FOCUS_NFE_HOMOLOGATION_BASE_URL';
    const fallback =
      env === 'production'
        ? 'https://api.focusnfe.com.br'
        : 'https://homologacao.focusnfe.com.br';
    return this.configService.get<string>(key, fallback);
  }

  private async dispatch<TBody>(
    options: FocusNfeRequestOptions<TBody>,
  ): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set('authorization', this.buildAuthorizationHeader());
    headers.set('accept', headers.get('accept') ?? 'application/json');
    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
    };

    if (options.body !== undefined) {
      headers.set('content-type', headers.get('content-type') ?? 'application/json');
      init.body = JSON.stringify(options.body);
    }

    return (this.injectedFetchImpl ?? fetch)(this.buildUrl(options.path, options.query), init);
  }

  private buildAuthorizationHeader() {
    const token = this.configService.get<string>('FOCUS_NFE_TOKEN');
    if (!token) {
      throw new InternalServerErrorException('Missing FOCUS_NFE_TOKEN configuration.');
    }
    return `Basic ${Buffer.from(`${token}:`).toString('base64')}`;
  }

  private buildUrl(path: string, query?: FocusNfeRequestOptions['query']): string {
    const baseUrl = path.startsWith('http') ? undefined : this.getBaseUrl();
    const url = new URL(path.startsWith('/') || path.startsWith('http') ? path : `/${path}`, baseUrl);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private parseJson<T>(input: string): T {
    try {
      return JSON.parse(input) as T;
    } catch (error) {
      throw new FocusNfeError('Focus NFe response is not valid JSON.', undefined, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
