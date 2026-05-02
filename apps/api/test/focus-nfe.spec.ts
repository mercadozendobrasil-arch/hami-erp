import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { ErpFiscalService } from '../src/erp/fiscal/erp-fiscal.service';
import { FocusNfeHttpService } from '../src/fiscal/focus-nfe/focus-nfe-http.service';
import { NuvemFiscalHttpService } from '../src/fiscal/nuvem-fiscal/nuvem-fiscal-http.service';

describe('FocusNfeHttpService', () => {
  const config = new ConfigService({
    FOCUS_NFE_ENV: 'homologation',
    FOCUS_NFE_TOKEN: 'focus-token',
  });

  it('sends Basic Auth requests to the homologation API without exposing the token in the body', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      text: async () => JSON.stringify({ ref: 'ORDER-1', status: 'processando_autorizacao' }),
    });
    const service = new FocusNfeHttpService(config, fetchImpl);

    await expect(
      service.post('/v2/nfe', { natureza_operacao: 'Venda' }, { ref: 'ORDER-1' }),
    ).resolves.toEqual({ ref: 'ORDER-1', status: 'processando_autorizacao' });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://homologacao.focusnfe.com.br/v2/nfe?ref=ORDER-1');
    expect(init.method).toBe('POST');
    expect(init.headers.get('authorization')).toBe(
      `Basic ${Buffer.from('focus-token:').toString('base64')}`,
    );
    expect(String(init.body)).not.toContain('focus-token');
  });
});

describe('ErpFiscalService Focus NFe issuance', () => {
  const configService = new ConfigService({
    FOCUS_NFE_ENV: 'homologation',
    FOCUS_NFE_TOKEN: 'focus-token',
  });

  const focusNfeHttp = {
    getEnvironment: jest.fn(() => 'homologation'),
    post: jest.fn(),
    download: jest.fn(),
  } as unknown as jest.Mocked<FocusNfeHttpService>;

  const nuvemFiscalHttp = {
    get: jest.fn(),
    download: jest.fn(),
  } as unknown as jest.Mocked<NuvemFiscalHttpService>;

  const prismaService = {
    erpFiscalDocument: {
      create: jest.fn(),
    },
    erpFiscalEvent: {
      create: jest.fn(),
    },
    erpOrderProjection: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('issues an order invoice through Focus NFe and records the document with provider FOCUS_NFE', async () => {
    focusNfeHttp.post.mockResolvedValue({
      ref: 'ORDER-1',
      status: 'autorizado',
      chave_nfe: '35260500000000000100550010000000101234567890',
      numero: '10',
      serie: '1',
      caminho_xml_nota_fiscal: '/arquivos/nfe.xml',
      caminho_danfe: '/arquivos/danfe.pdf',
      valor_total: '199.90',
    });
    prismaService.erpFiscalDocument.create.mockResolvedValue({
      id: 'doc-1',
      provider: 'FOCUS_NFE',
      type: 'NFE',
      status: 'AUTHORIZED',
      shopId: '123',
      orderSn: 'ORDER-1',
      providerDocumentId: 'ORDER-1',
      accessKey: '35260500000000000100550010000000101234567890',
      number: '10',
      series: '1',
      issueDate: null,
      totalAmount: new Prisma.Decimal('199.90'),
      currency: 'BRL',
      xmlAvailable: true,
      pdfAvailable: true,
      lastSyncedAt: new Date('2026-05-02T12:00:00.000Z'),
      errorMessage: null,
      createdAt: new Date('2026-05-02T12:00:00.000Z'),
      updatedAt: new Date('2026-05-02T12:00:00.000Z'),
    });
    prismaService.erpFiscalEvent.create.mockResolvedValue({ id: 'event-1' });
    prismaService.erpOrderProjection.updateMany.mockResolvedValue({ count: 1 });
    const service = new ErpFiscalService(
      configService,
      focusNfeHttp,
      nuvemFiscalHttp,
      prismaService as never,
    );

    await expect(
      service.issueOrderInvoice({
        shopId: '123',
        orderSn: 'ORDER-1',
        type: 'NFE',
        payload: {
          natureza_operacao: 'Venda',
          valor_total: '199.90',
        },
      }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        document: {
          id: 'doc-1',
          provider: 'FOCUS_NFE',
          status: 'AUTHORIZED',
          providerDocumentId: 'ORDER-1',
          accessKey: '35260500000000000100550010000000101234567890',
        },
        raw: expect.objectContaining({ ref: 'ORDER-1' }),
      },
    });

    expect(focusNfeHttp.post).toHaveBeenCalledWith(
      '/v2/nfe',
      {
        natureza_operacao: 'Venda',
        valor_total: '199.90',
      },
      { ref: 'ORDER-1' },
    );
    expect(prismaService.erpFiscalDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'FOCUS_NFE',
        type: 'NFE',
        status: 'AUTHORIZED',
        shopId: '123',
        orderSn: 'ORDER-1',
        providerDocumentId: 'ORDER-1',
        accessKey: '35260500000000000100550010000000101234567890',
      }),
    });
  });
});
