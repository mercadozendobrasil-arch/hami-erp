import { ConfigService } from '@nestjs/config';

import { NuvemFiscalAuthService } from '../src/fiscal/nuvem-fiscal/nuvem-fiscal-auth.service';
import { NuvemFiscalHttpService } from '../src/fiscal/nuvem-fiscal/nuvem-fiscal-http.service';

describe('NuvemFiscalAuthService', () => {
  const config = new ConfigService({
    NUVEM_FISCAL_AUTH_URL: 'https://auth.nuvemfiscal.com.br/oauth/token',
    NUVEM_FISCAL_CLIENT_ID: 'client-id',
    NUVEM_FISCAL_CLIENT_SECRET: 'client-secret',
    NUVEM_FISCAL_SCOPES: 'empresa cep cnpj',
    NUVEM_FISCAL_ENV: 'sandbox',
    NUVEM_FISCAL_SANDBOX_BASE_URL: 'https://api.sandbox.nuvemfiscal.com.br',
    NUVEM_FISCAL_PROD_BASE_URL: 'https://api.nuvemfiscal.com.br',
    NUVEM_FISCAL_TIMEOUT_MS: '10000',
  });

  it('fetches an OAuth token with form encoded client credentials', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ access_token: 'token-1', expires_in: 3600 }),
    });
    const service = new NuvemFiscalAuthService(config, fetchImpl);

    await expect(service.getAccessToken()).resolves.toBe('token-1');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://auth.nuvemfiscal.com.br/oauth/token');
    expect(init.method).toBe('POST');
    expect(init.headers.get('content-type')).toBe(
      'application/x-www-form-urlencoded',
    );
    expect(String(init.body)).toContain('grant_type=client_credentials');
    expect(String(init.body)).toContain('client_id=client-id');
    expect(String(init.body)).toContain('client_secret=client-secret');
    expect(String(init.body)).toContain('scope=empresa+cep+cnpj');
  });

  it('reuses a cached access token before expiry', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ access_token: 'token-1', expires_in: 3600 }),
    });
    const service = new NuvemFiscalAuthService(config, fetchImpl);

    await service.getAccessToken();
    await service.getAccessToken();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('sends bearer authenticated requests to the configured API base URL', async () => {
    const authService = {
      getAccessToken: jest.fn().mockResolvedValue('token-1'),
    };
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ cep: '01001000' }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });
    const service = new NuvemFiscalHttpService(
      config,
      authService as unknown as NuvemFiscalAuthService,
      fetchImpl,
    );

    await expect(service.get('/cep/01001000')).resolves.toEqual({
      cep: '01001000',
    });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.sandbox.nuvemfiscal.com.br/cep/01001000');
    expect(init.method).toBe('GET');
    expect(init.headers.get('authorization')).toBe('Bearer token-1');
    expect(init.headers.get('accept')).toBe('application/json');
  });
});
