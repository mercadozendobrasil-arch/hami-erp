import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { ErpFiscalService } from '../src/erp/fiscal/erp-fiscal.service';
import { ErpOrdersService } from '../src/erp/orders/erp-orders.service';
import { NuvemFiscalHttpService } from '../src/fiscal/nuvem-fiscal/nuvem-fiscal-http.service';
import { InvoiceSdk } from '../src/shopee-sdk/modules/invoice.sdk';

describe('ErpFiscalService automatic invoice issuance', () => {
  const configService = new ConfigService({
    NUVEM_FISCAL_ENV: 'sandbox',
    NUVEM_FISCAL_CLIENT_ID: 'client-id',
    NUVEM_FISCAL_CLIENT_SECRET: 'client-secret',
  });

  const fiscalHttp = {
    getEnvironment: jest.fn(() => 'sandbox'),
    post: jest.fn(),
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

  it('issues an order invoice through Nuvem Fiscal and records the local document', async () => {
    fiscalHttp.post.mockResolvedValue({
      id: 'nf-123',
      status: 'autorizada',
      chave: '35260500000000000100550010000000101234567890',
      numero: '10',
      serie: '1',
      data_emissao: '2026-05-02T12:00:00.000Z',
      valor_total: '199.90',
    });
    prismaService.erpFiscalDocument.create.mockResolvedValue({
      id: 'doc-1',
      provider: 'NUVEM_FISCAL',
      type: 'NFE',
      status: 'AUTHORIZED',
      shopId: '123',
      orderSn: 'ORDER-1',
      providerDocumentId: 'nf-123',
      accessKey: '35260500000000000100550010000000101234567890',
      number: '10',
      series: '1',
      issueDate: new Date('2026-05-02T12:00:00.000Z'),
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
      fiscalHttp,
      prismaService as never,
    );

    await expect(
      service.issueOrderInvoice({
        shopId: '123',
        orderSn: 'ORDER-1',
        type: 'NFE',
        payload: {
          pedido: 'ORDER-1',
          valor_total: '199.90',
        },
      }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        document: {
          id: 'doc-1',
          status: 'AUTHORIZED',
          providerDocumentId: 'nf-123',
          accessKey: '35260500000000000100550010000000101234567890',
        },
        raw: expect.objectContaining({ id: 'nf-123' }),
      },
    });

    expect(fiscalHttp.post).toHaveBeenCalledWith('/nfe', {
      pedido: 'ORDER-1',
      valor_total: '199.90',
    });
    expect(prismaService.erpFiscalDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'NUVEM_FISCAL',
        type: 'NFE',
        status: 'AUTHORIZED',
        shopId: '123',
        orderSn: 'ORDER-1',
        providerDocumentId: 'nf-123',
        accessKey: '35260500000000000100550010000000101234567890',
      }),
    });
    expect(prismaService.erpFiscalEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'ISSUE',
        status: 'AUTHORIZED',
      }),
    });
    expect(prismaService.erpOrderProjection.updateMany).toHaveBeenCalledWith({
      where: { shopId: '123', orderSn: 'ORDER-1' },
      data: { invoiceStatus: 'AUTHORIZED' },
    });
  });
});

describe('InvoiceSdk', () => {
  it('registers invoice metadata against the Shopee order with stored token auth', async () => {
    const shopeeClient = {
      request: jest.fn().mockResolvedValue({
        raw: {
          request_id: 'req-1',
          response: { success: true },
        },
      }),
    };
    const tokenService = {
      findRequiredTokenByShopId: jest.fn().mockResolvedValue({
        token: { accessToken: 'shop-token' },
      }),
    };
    const sdk = new InvoiceSdk(shopeeClient as never, tokenService as never);

    await expect(
      sdk.registerInvoice('123', {
        orderSn: 'ORDER-1',
        providerDocumentId: 'nf-123',
        accessKey: 'key-1',
        number: '10',
        series: '1',
        xmlAvailable: true,
        pdfAvailable: true,
        raw: { id: 'nf-123' },
      }),
    ).resolves.toEqual({
      request_id: 'req-1',
      response: { success: true },
    });

    expect(tokenService.findRequiredTokenByShopId).toHaveBeenCalledWith(BigInt(123));
    expect(shopeeClient.request).toHaveBeenCalledWith({
      path: '/order/upload_invoice_doc',
      method: 'POST',
      shopId: '123',
      accessToken: 'shop-token',
      body: {
        order_sn: 'ORDER-1',
        invoice_document_id: 'nf-123',
        access_key: 'key-1',
        number: '10',
        series: '1',
        xml_available: true,
        pdf_available: true,
        fiscal_document: { id: 'nf-123' },
      },
    });
  });
});

describe('ErpOrdersService auto invoice workflow', () => {
  it('issues invoice, registers it with Shopee, creates the shipping document task, and marks the order waiting for pickup preparation', async () => {
    const prismaService = {
      erpOrderProjection: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'projection-1',
          shopId: '123',
          orderSn: 'ORDER-1',
          fulfillmentStage: 'pending_invoice',
          orderStatus: 'READY_TO_SHIP',
          packageNumber: 'PKG-1',
          shippingDocumentType: 'NORMAL_AIR_WAYBILL',
          totalAmount: new Prisma.Decimal('199.90'),
          currency: 'BRL',
          raw: { item_list: [{ item_id: 1 }] },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'projection-1',
          fulfillmentStage: 'pending_print',
        }),
      },
      jobRecord: {
        create: jest.fn().mockResolvedValue({ id: 'job-print' }),
        update: jest.fn().mockResolvedValue({ id: 'job-print' }),
      },
      erpShippingLabelRecord: {
        create: jest.fn().mockResolvedValue({ id: 'label-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      erpOrderOperationLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
      erpOrderStageHistory: {
        create: jest.fn().mockResolvedValue({ id: 'stage-1' }),
      },
      erpOrderException: {
        create: jest.fn(),
      },
      $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
    };
    const orderSdk = {
      createShippingDocument: jest.fn().mockResolvedValue({
        request_id: 'label-req',
        response: { success: true },
      }),
    };
    const fiscalService = {
      issueOrderInvoice: jest.fn().mockResolvedValue({
        success: true,
        data: {
          document: {
            id: 'doc-1',
            providerDocumentId: 'nf-123',
            accessKey: 'key-1',
            number: '10',
            series: '1',
            xmlAvailable: true,
            pdfAvailable: true,
          },
          raw: { id: 'nf-123' },
        },
      }),
    };
    const invoiceSdk = {
      registerInvoice: jest.fn().mockResolvedValue({
        request_id: 'invoice-req',
        response: { success: true },
      }),
    };
    const service = new (ErpOrdersService as any)(
      prismaService,
      orderSdk,
      fiscalService,
      invoiceSdk,
    );

    await expect(
      service.autoInvoiceOrder('ORDER-1', {
        shopId: '123',
        type: 'NFE',
        payload: {
          pedido: 'ORDER-1',
          valor_total: '199.90',
        },
        shippingDocumentType: 'NORMAL_AIR_WAYBILL',
      }),
    ).resolves.toMatchObject({
      success: true,
      data: {
        fiscalDocumentId: 'doc-1',
        shopeeInvoiceResult: {
          request_id: 'invoice-req',
        },
        shippingDocumentJobId: 'job-print',
        labelIds: ['label-1'],
      },
    });

    expect(fiscalService.issueOrderInvoice).toHaveBeenCalledWith({
      shopId: '123',
      orderSn: 'ORDER-1',
      type: 'NFE',
      payload: {
        pedido: 'ORDER-1',
        valor_total: '199.90',
      },
    });
    expect(invoiceSdk.registerInvoice).toHaveBeenCalledWith('123', {
      orderSn: 'ORDER-1',
      providerDocumentId: 'nf-123',
      accessKey: 'key-1',
      number: '10',
      series: '1',
      xmlAvailable: true,
      pdfAvailable: true,
      raw: { id: 'nf-123' },
    });
    expect(orderSdk.createShippingDocument).toHaveBeenCalledWith('123', [
      {
        orderSn: 'ORDER-1',
        packageNumber: 'PKG-1',
        shippingDocumentType: 'NORMAL_AIR_WAYBILL',
      },
    ]);
    expect(prismaService.erpOrderProjection.update).toHaveBeenCalledWith({
      where: {
        shopId_orderSn: {
          shopId: '123',
          orderSn: 'ORDER-1',
        },
      },
      data: {
        invoiceStatus: 'AUTHORIZED',
        fulfillmentStage: 'pending_print',
      },
    });
  });
});
