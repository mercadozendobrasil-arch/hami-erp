import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NuvemFiscalAuthService } from './nuvem-fiscal-auth.service';
import {
  NuvemFiscalError,
  type NuvemFiscalEnvironment,
  type NuvemFiscalRequestOptions,
} from './nuvem-fiscal.types';

@Injectable()
export class NuvemFiscalHttpService {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: NuvemFiscalAuthService,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async get<TResponse>(
    path: string,
    query?: NuvemFiscalRequestOptions['query'],
  ): Promise<TResponse> {
    return this.request<TResponse>({ method: 'GET', path, query });
  }

  async post<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    query?: NuvemFiscalRequestOptions['query'],
  ): Promise<TResponse> {
    return this.request<TResponse>({ method: 'POST', path, body, query });
  }

  async request<TResponse, TBody = unknown>(
    options: NuvemFiscalRequestOptions<TBody>,
  ): Promise<TResponse> {
    const response = await this.dispatch(options);
    const text = await response.text();
    const payload = text ? this.parseJson<TResponse>(text) : ({} as TResponse);

    if (!response.ok) {
      throw new NuvemFiscalError(
        `Nuvem Fiscal request failed with status ${response.status}.`,
        response.status,
        payload,
      );
    }

    return payload;
  }

  async download(path: string, query?: NuvemFiscalRequestOptions['query']): Promise<Buffer> {
    const response = await this.dispatch({ method: 'GET', path, query });

    if (!response.ok) {
      const text = await response.text();
      throw new NuvemFiscalError(
        `Nuvem Fiscal download failed with status ${response.status}.`,
        response.status,
        text,
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }

  getEnvironment(): NuvemFiscalEnvironment {
    const env = this.configService.get<string>('NUVEM_FISCAL_ENV', 'sandbox');
    if (env === 'production') return 'production';
    if (env === 'sandbox') return 'sandbox';
    throw new InternalServerErrorException(
      `Invalid NUVEM_FISCAL_ENV "${env}". Expected "sandbox" or "production".`,
    );
  }

  getBaseUrl(): string {
    const env = this.getEnvironment();
    const key =
      env === 'production'
        ? 'NUVEM_FISCAL_PROD_BASE_URL'
        : 'NUVEM_FISCAL_SANDBOX_BASE_URL';
    const fallback =
      env === 'production'
        ? 'https://api.nuvemfiscal.com.br'
        : 'https://api.sandbox.nuvemfiscal.com.br';
    return this.configService.get<string>(key, fallback);
  }

  private async dispatch<TBody>(
    options: NuvemFiscalRequestOptions<TBody>,
  ): Promise<Response> {
    const token = await this.authService.getAccessToken();
    const headers = new Headers(options.headers);
    headers.set('authorization', `Bearer ${token}`);
    headers.set('accept', headers.get('accept') ?? 'application/json');
    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
    };

    if (options.body !== undefined) {
      headers.set('content-type', headers.get('content-type') ?? 'application/json');
      init.body = JSON.stringify(options.body);
    }

    return this.fetchImpl(this.buildUrl(options.path, options.query), init);
  }

  private buildUrl(
    path: string,
    query?: NuvemFiscalRequestOptions['query'],
  ): string {
    const url = new URL(path.startsWith('/') ? path : `/${path}`, this.getBaseUrl());

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
      throw new NuvemFiscalError('Nuvem Fiscal response is not valid JSON.', undefined, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
