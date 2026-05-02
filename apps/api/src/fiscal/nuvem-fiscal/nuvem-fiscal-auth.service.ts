import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NuvemFiscalError, type NuvemFiscalTokenResponse } from './nuvem-fiscal.types';

@Injectable()
export class NuvemFiscalAuthService {
  private cachedToken?: { accessToken: string; expiresAt: number };

  constructor(
    private readonly configService: ConfigService,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.accessToken;
    }

    const token = await this.fetchToken();
    const expiresIn = Math.max(60, token.expires_in ?? 3600);
    this.cachedToken = {
      accessToken: token.access_token,
      expiresAt: Date.now() + (expiresIn - 60) * 1000,
    };

    return this.cachedToken.accessToken;
  }

  private async fetchToken(): Promise<NuvemFiscalTokenResponse> {
    const authUrl = this.requiredString('NUVEM_FISCAL_AUTH_URL');
    const clientId = this.requiredString('NUVEM_FISCAL_CLIENT_ID');
    const clientSecret = this.requiredString('NUVEM_FISCAL_CLIENT_SECRET');
    const scope = this.configService.get<string>('NUVEM_FISCAL_SCOPES', 'empresa cep cnpj');
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    });
    const headers = new Headers({
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    });

    const response = await this.fetchImpl(authUrl, {
      method: 'POST',
      headers,
      body,
    });
    const responseText = await response.text();
    const payload = this.parseJson<NuvemFiscalTokenResponse>(responseText);

    if (!response.ok) {
      throw new NuvemFiscalError(
        `Nuvem Fiscal token request failed with status ${response.status}.`,
        response.status,
        payload,
      );
    }

    if (!payload.access_token) {
      throw new NuvemFiscalError('Nuvem Fiscal token response is missing access_token.');
    }

    return payload;
  }

  private parseJson<T>(input: string): T {
    try {
      return JSON.parse(input) as T;
    } catch (error) {
      throw new NuvemFiscalError('Nuvem Fiscal token response is not valid JSON.', undefined, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private requiredString(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new InternalServerErrorException(`Missing ${key} configuration.`);
    }
    return value;
  }
}
