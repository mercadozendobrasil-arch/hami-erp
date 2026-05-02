import { Controller, Get, Header, Param, Query, StreamableFile } from '@nestjs/common';

import { ErpFiscalDocumentQueryDto } from './dto/erp-fiscal.dto';
import { ErpFiscalService } from './erp-fiscal.service';

@Controller('erp/fiscal')
export class ErpFiscalController {
  constructor(private readonly erpFiscalService: ErpFiscalService) {}

  @Get('health')
  getHealth() {
    return this.erpFiscalService.getHealth();
  }

  @Get('cep/:cep')
  lookupCep(@Param('cep') cep: string) {
    return this.erpFiscalService.lookupCep(cep);
  }

  @Get('cnpj/:cnpj')
  lookupCnpj(@Param('cnpj') cnpj: string) {
    return this.erpFiscalService.lookupCnpj(cnpj);
  }

  @Get('quotas')
  listQuotas() {
    return this.erpFiscalService.listQuotas();
  }

  @Get('companies/:cpfCnpj')
  getCompany(@Param('cpfCnpj') cpfCnpj: string) {
    return this.erpFiscalService.getCompany(cpfCnpj);
  }

  @Get('documents')
  listDocuments(@Query() query: ErpFiscalDocumentQueryDto) {
    return this.erpFiscalService.listDocuments(query);
  }

  @Get('documents/:id')
  getDocument(@Param('id') id: string) {
    return this.erpFiscalService.getDocument(id);
  }

  @Get('documents/:id/xml')
  @Header('Content-Type', 'application/xml')
  async downloadXml(@Param('id') id: string) {
    const { file, filename } = await this.erpFiscalService.downloadDocument(id, 'xml');
    return new StreamableFile(file, {
      disposition: `attachment; filename="${filename}"`,
      type: 'application/xml',
    });
  }

  @Get('documents/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadPdf(@Param('id') id: string) {
    const { file, filename } = await this.erpFiscalService.downloadDocument(id, 'pdf');
    return new StreamableFile(file, {
      disposition: `attachment; filename="${filename}"`,
      type: 'application/pdf',
    });
  }
}
