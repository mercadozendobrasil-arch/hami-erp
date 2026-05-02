import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { ErpFiscalService } from '../src/erp/fiscal/erp-fiscal.service';
import { FocusNfeHttpService } from '../src/fiscal/focus-nfe/focus-nfe-http.service';
import { NuvemFiscalHttpService } from '../src/fiscal/nuvem-fiscal/nuvem-fiscal-http.service';

const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');

describe('ERP fiscal schema', () => {
  it('defines fiscal provider, document, event, and company config models', () => {
    const source = readFileSync(schemaPath, 'utf8');

    expect(source).toContain('enum ErpFiscalProvider');
    expect(source).toContain('enum ErpFiscalDocumentType');
    expect(source).toContain('enum ErpFiscalDocumentStatus');
    expect(source).toContain('enum ErpFiscalEventType');
    expect(source).toContain('model ErpFiscalCompanyConfig');
    expect(source).toContain('model ErpFiscalDocument');
    expect(source).toContain('model ErpFiscalEvent');
  });
});

describe('ErpFiscalService', () => {
  const configService = new ConfigService({
    FOCUS_NFE_ENV: 'homologation',
    FOCUS_NFE_TOKEN: 'focus-token',
  });

  const focusNfeHttp = {
    getEnvironment: jest.fn(() => 'homologation'),
    download: jest.fn(),
  } as unknown as jest.Mocked<FocusNfeHttpService>;

  const fiscalHttp = {
    get: jest.fn(),
    download: jest.fn(),
  } as unknown as jest.Mocked<NuvemFiscalHttpService>;

  const prismaService = {
    erpFiscalDocument: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    erpFiscalEvent: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports configured health without exposing credentials', () => {
    const service = new ErpFiscalService(
      configService,
      focusNfeHttp,
      fiscalHttp,
      prismaService as never,
    );

    expect(service.getHealth()).toEqual({
      success: true,
      data: {
        provider: 'FOCUS_NFE',
        environment: 'homologation',
        credentialsConfigured: true,
      },
    });
  });

  it('rejects Nuvem-only lookup endpoints while Focus NFe is the active provider', async () => {
    const service = new ErpFiscalService(
      configService,
      focusNfeHttp,
      fiscalHttp,
      prismaService as never,
    );

    await expect(service.lookupCep('01001-000')).rejects.toThrow(
      'Fiscal lookup cep is not available for Focus NFe.',
    );
    await expect(service.lookupCnpj('11.222.333/0001-81')).rejects.toThrow(
      'Fiscal lookup cnpj is not available for Focus NFe.',
    );
    await expect(service.listQuotas()).rejects.toThrow(
      'Fiscal quota lookup is not available for Focus NFe.',
    );
    await expect(service.getCompany('11.222.333/0001-81')).rejects.toThrow(
      'Fiscal company lookup is not available for Focus NFe.',
    );
    expect(fiscalHttp.get).not.toHaveBeenCalled();
  });

  it('lists local fiscal documents with ERP pagination shape', async () => {
    prismaService.erpFiscalDocument.count.mockResolvedValue(1);
    prismaService.erpFiscalDocument.findMany.mockResolvedValue([
      {
        id: 'doc-1',
        provider: 'NUVEM_FISCAL',
        type: 'NFE',
        status: 'AUTHORIZED',
        shopId: '123',
        orderSn: 'ORDER-1',
        providerDocumentId: 'nf-1',
        accessKey: 'key-1',
        number: '10',
        series: '1',
        issueDate: new Date('2026-05-01T10:00:00.000Z'),
        totalAmount: new Prisma.Decimal('123.45'),
        currency: 'BRL',
        xmlAvailable: true,
        pdfAvailable: true,
        lastSyncedAt: new Date('2026-05-01T11:00:00.000Z'),
        errorMessage: null,
        createdAt: new Date('2026-05-01T09:00:00.000Z'),
        updatedAt: new Date('2026-05-01T11:00:00.000Z'),
      },
    ]);
    const service = new ErpFiscalService(
      configService,
      focusNfeHttp,
      fiscalHttp,
      prismaService as never,
    );

    await expect(
      service.listDocuments({ shopId: '123', current: 1, pageSize: 20 }),
    ).resolves.toMatchObject({
      success: true,
      total: 1,
      current: 1,
      pageSize: 20,
      data: [
        {
          id: 'doc-1',
          provider: 'NUVEM_FISCAL',
          type: 'NFE',
          status: 'AUTHORIZED',
          shopId: '123',
          orderSn: 'ORDER-1',
          totalAmount: '123.45',
          xmlAvailable: true,
          pdfAvailable: true,
        },
      ],
    });
  });
});
