import { Injectable } from '@nestjs/common';

import { ShopeeApiEnvelope } from '../../common/shopee.types';
import { ShopeeTokenService } from '../../common/shopee-token.service';

import { ShopeeClient } from '../shopee-client';

export interface ShopeeInvoiceRegistrationInput {
  orderSn: string;
  providerDocumentId?: string | null;
  accessKey?: string | null;
  number?: string | null;
  series?: string | null;
  xmlAvailable?: boolean;
  pdfAvailable?: boolean;
  raw?: unknown;
}

@Injectable()
export class InvoiceSdk {
  constructor(
    private readonly shopeeClient: ShopeeClient,
    private readonly tokenService: ShopeeTokenService,
  ) {}

  async registerInvoice(
    shopId: string,
    input: ShopeeInvoiceRegistrationInput,
  ): Promise<ShopeeApiEnvelope<Record<string, unknown>>> {
    const { token } = await this.tokenService.findRequiredTokenByShopId(
      BigInt(shopId),
    );
    const response = await this.shopeeClient.request<Record<string, unknown>>({
      path: '/order/upload_invoice_doc',
      method: 'POST',
      shopId,
      accessToken: token.accessToken,
      body: {
        order_sn: input.orderSn,
        invoice_document_id: input.providerDocumentId,
        access_key: input.accessKey,
        number: input.number,
        series: input.series,
        xml_available: input.xmlAvailable ?? false,
        pdf_available: input.pdfAvailable ?? false,
        fiscal_document: input.raw,
      },
    });

    return response.raw;
  }
}
