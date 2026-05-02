import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { ErpFiscalService } from '../src/erp/fiscal/erp-fiscal.service';
import { ErpOrdersService } from '../src/erp/orders/erp-orders.service';
import { FocusNfeHttpService } from '../src/fiscal/focus-nfe/focus-nfe-http.service';
import { NuvemFiscalHttpService } from '../src/fiscal/nuvem-fiscal/nuvem-fiscal-http.service';
import { InvoiceSdk } from '../src/shopee-sdk/modules/invoice.sdk';

describe('ErpFiscalService automatic invoice issuance', () => {
  const configService = new ConfigService({
    FOCUS_NFE_ENV: 'homologation',
    FOCUS_NFE_TOKEN: 'focus-token',
  });

  const focusNfeHttp = {
    getEnvironment: jest.fn(() => 'homologation'),
    post: jest.fn(),
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

  it('issues an order invoice through Focus NFe and records the local document', async () => {
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
          providerDocumentId: 'ORDER-1',
          accessKey: '35260500000000000100550010000000101234567890',
        },
        raw: expect.objectContaining({ ref: 'ORDER-1' }),
      },
    });

    expect(focusNfeHttp.post).toHaveBeenCalledWith(
      '/v2/nfe',
      {
        pedido: 'ORDER-1',
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
  const buildPrismaService = () => ({
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
      create: jest.fn().mockResolvedValue({ id: 'exception-1' }),
    },
    $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)),
  });

  const buildOrderSdk = () => ({
    createShippingDocument: jest.fn().mockResolvedValue({
      request_id: 'label-req',
      response: { success: true },
    }),
  });

  const buildFiscalService = (status = 'AUTHORIZED') => ({
    issueOrderInvoice: jest.fn().mockResolvedValue({
      success: true,
      data: {
        document: {
          id: 'doc-1',
          status,
          providerDocumentId: 'nf-123',
          accessKey: 'key-1',
          number: '10',
          series: '1',
          xmlAvailable: status === 'AUTHORIZED',
          pdfAvailable: status === 'AUTHORIZED',
        },
        raw: { id: 'nf-123', status },
      },
    }),
  });

  const buildInvoiceSdk = () => ({
    registerInvoice: jest.fn().mockResolvedValue({
      request_id: 'invoice-req',
      response: { success: true },
    }),
  });

  it('issues invoice, registers it with Shopee, creates the shipping document task, and marks the order waiting for pickup preparation', async () => {
    const prismaService = buildPrismaService();
    const orderSdk = buildOrderSdk();
    const fiscalService = buildFiscalService();
    const invoiceSdk = buildInvoiceSdk();
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
      raw: expect.objectContaining({ id: 'nf-123' }),
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

  it('does not register the invoice or create the shipping document until Focus authorizes the invoice', async () => {
    const prismaService = buildPrismaService();
    const orderSdk = buildOrderSdk();
    const fiscalService = buildFiscalService('PROCESSING');
    const invoiceSdk = buildInvoiceSdk();
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
      }),
    ).rejects.toThrow('Fiscal invoice is PROCESSING');

    expect(invoiceSdk.registerInvoice).not.toHaveBeenCalled();
    expect(orderSdk.createShippingDocument).not.toHaveBeenCalled();
    expect(prismaService.erpOrderProjection.update).not.toHaveBeenCalled();
    expect(prismaService.erpOrderException.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        shopId: '123',
        orderSn: 'ORDER-1',
        exceptionType: 'invoice_not_authorized',
        source: 'AUTO_INVOICE',
      }),
    });
    expect(prismaService.erpOrderOperationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        shopId: '123',
        orderSn: 'ORDER-1',
        action: 'AUTO_INVOICE',
        status: 'BLOCKED',
      }),
    });
  });
});
