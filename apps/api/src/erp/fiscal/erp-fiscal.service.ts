import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErpFiscalDocumentStatus,
  ErpFiscalDocumentType,
  ErpFiscalEventType,
  ErpFiscalProvider,
  Prisma,
} from '@prisma/client';

import { erpData } from '../common/erp-response';
import { FocusNfeHttpService } from '../../fiscal/focus-nfe/focus-nfe-http.service';
import { NuvemFiscalHttpService } from '../../fiscal/nuvem-fiscal/nuvem-fiscal-http.service';
import { PrismaService } from '../../infra/database/prisma.service';

import {
  ErpFiscalDocumentQueryDto,
  ErpFiscalIssueOrderInvoiceDto,
} from './dto/erp-fiscal.dto';

type FiscalDocumentRow = {
  id: string;
  provider: string;
  type: string;
  status: string;
  shopId: string;
  orderSn: string | null;
  providerDocumentId: string | null;
  accessKey: string | null;
  number: string | null;
  series: string | null;
  issueDate: Date | null;
  totalAmount: Prisma.Decimal | null;
  currency: string;
  xmlAvailable: boolean;
  pdfAvailable: boolean;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ErpFiscalService {
  constructor(
    private readonly configService: ConfigService,
    private readonly focusNfeHttpService: FocusNfeHttpService,
    private readonly nuvemFiscalHttpService: NuvemFiscalHttpService,
    private readonly prismaService: PrismaService,
  ) {}

  getHealth() {
    return erpData({
      provider: 'FOCUS_NFE',
      environment: this.focusNfeHttpService.getEnvironment(),
      credentialsConfigured: Boolean(this.configService.get<string>('FOCUS_NFE_TOKEN')),
    });
  }

  async lookupCep(cep: string) {
    this.assertFocusUnsupported('lookup cep');
    const normalizedCep = this.onlyDigits(cep);
    const raw = await this.nuvemFiscalHttpService.get<Record<string, unknown>>(
      `/cep/${normalizedCep}`,
    );

    return erpData({
      cep: this.optionalString(raw.cep) ?? normalizedCep,
      street: this.optionalString(raw.logradouro ?? raw.street),
      district: this.optionalString(raw.bairro ?? raw.district),
      city: this.optionalString(raw.municipio ?? raw.localidade ?? raw.city),
      state: this.optionalString(raw.uf ?? raw.state),
      raw,
    });
  }

  async lookupCnpj(cnpj: string) {
    this.assertFocusUnsupported('lookup cnpj');
    const normalizedCnpj = this.onlyDigits(cnpj);
    const raw = await this.nuvemFiscalHttpService.get<Record<string, unknown>>(
      `/cnpj/${normalizedCnpj}`,
    );

    return erpData({
      cnpj: this.optionalString(raw.cnpj) ?? normalizedCnpj,
      legalName: this.optionalString(raw.razao_social ?? raw.razaoSocial),
      tradeName: this.optionalString(raw.nome_fantasia ?? raw.nomeFantasia),
      status: this.optionalString(raw.situacao_cadastral ?? raw.situacaoCadastral),
      state: this.optionalString(raw.uf),
      city: this.optionalString(raw.municipio),
      raw,
    });
  }

  async listQuotas() {
    this.assertFocusUnsupported('quota lookup');
    return erpData(await this.nuvemFiscalHttpService.get('/conta/cotas'));
  }

  async getCompany(cpfCnpj: string) {
    this.assertFocusUnsupported('company lookup');
    const normalizedCpfCnpj = this.onlyDigits(cpfCnpj);
    return erpData(
      await this.nuvemFiscalHttpService.get(`/empresas/${normalizedCpfCnpj}`),
    );
  }

  async listDocuments(query: ErpFiscalDocumentQueryDto) {
    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildDocumentWhere(query);

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.erpFiscalDocument.count({ where }),
      this.prismaService.erpFiscalDocument.findMany({
        where,
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: data.map((item) => this.toDocumentItem(item)),
      total,
      current,
      pageSize,
    };
  }

  async issueOrderInvoice(payload: ErpFiscalIssueOrderInvoiceDto) {
    const type = payload.type ?? 'NFE';
    const raw = await this.focusNfeHttpService.post<Record<string, unknown>>(
      `/v2/${type.toLowerCase()}`,
      payload.payload,
      { ref: payload.orderSn },
    );
    const status = this.mapDocumentStatus(raw);
    const providerDocumentId = this.optionalString(
      raw.ref ?? raw.id ?? raw.uuid ?? raw.document_id ?? raw.documentId,
    );
    const accessKey = this.optionalString(
      raw.chave_nfe ?? raw.chave ?? raw.chave_acesso ?? raw.access_key ?? raw.accessKey,
    );
    const issueDate = this.optionalDate(
      raw.data_emissao ?? raw.issue_date ?? raw.created_at,
    );

    const document = await this.prismaService.erpFiscalDocument.create({
      data: {
        provider: ErpFiscalProvider.FOCUS_NFE,
        type: type as ErpFiscalDocumentType,
        status,
        shopId: payload.shopId,
        orderSn: payload.orderSn,
        providerDocumentId,
        accessKey,
        number: this.optionalString(raw.numero ?? raw.number),
        series: this.optionalString(raw.serie ?? raw.series),
        issueDate,
        totalAmount: this.optionalDecimal(
          raw.valor_total ?? raw.total_amount ?? raw.valorTotal,
        ),
        currency: this.optionalString(raw.moeda ?? raw.currency) ?? 'BRL',
        xmlAvailable: payload.xmlAvailable ?? status === ErpFiscalDocumentStatus.AUTHORIZED,
        pdfAvailable: payload.pdfAvailable ?? status === ErpFiscalDocumentStatus.AUTHORIZED,
        lastSyncedAt: new Date(),
        raw: this.toJson(raw),
        errorMessage:
          status === ErpFiscalDocumentStatus.REJECTED ||
          status === ErpFiscalDocumentStatus.FAILED
            ? this.optionalString(raw.mensagem ?? raw.message ?? raw.error)
            : undefined,
      },
    });

    await this.prismaService.erpFiscalEvent.create({
      data: {
        fiscalDocumentId: document.id,
        eventType: ErpFiscalEventType.ISSUE,
        status,
        request: this.toJson(payload.payload),
        response: this.toJson(raw),
        errorMessage: document.errorMessage,
      },
    });

    await this.prismaService.erpOrderProjection.updateMany({
      where: {
        shopId: payload.shopId,
        orderSn: payload.orderSn,
      },
      data: {
        invoiceStatus: status,
      },
    });

    return erpData({
      document: this.toDocumentItem(document),
      raw,
    });
  }

  async getDocument(id: string) {
    const document = await this.prismaService.erpFiscalDocument.findUnique({
      where: { id },
    });
    if (!document) {
      throw new NotFoundException('ERP fiscal document not found.');
    }

    const events = await this.prismaService.erpFiscalEvent.findMany({
      where: { fiscalDocumentId: id },
      orderBy: { createdAt: 'desc' },
    });

    return erpData({
      ...this.toDocumentItem(document),
      events: events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        status: event.status,
        errorMessage: event.errorMessage,
        createdAt: event.createdAt.toISOString(),
      })),
    });
  }

  async downloadDocument(id: string, artifact: 'xml' | 'pdf') {
    const document = await this.prismaService.erpFiscalDocument.findUnique({
      where: { id },
    });
    if (!document) {
      throw new NotFoundException('ERP fiscal document not found.');
    }

    const available = artifact === 'xml' ? document.xmlAvailable : document.pdfAvailable;
    if (!available || !document.providerDocumentId) {
      throw new ConflictException(`Fiscal ${artifact.toUpperCase()} is not ready.`);
    }

    const downloadPath = this.resolveDownloadPath(document, artifact);
    const file = document.provider === 'FOCUS_NFE'
      ? await this.focusNfeHttpService.download(downloadPath)
      : await this.nuvemFiscalHttpService.download(downloadPath);

    return {
      file,
      filename: `${document.orderSn ?? document.id}-${artifact}.${artifact}`,
    };
  }

  private buildDocumentWhere(
    query: ErpFiscalDocumentQueryDto,
  ): Prisma.ErpFiscalDocumentWhereInput {
    const where: Prisma.ErpFiscalDocumentWhereInput = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.orderSn ? { orderSn: query.orderSn } : {}),
      ...(query.type ? { type: query.type as ErpFiscalDocumentType } : {}),
      ...(query.status ? { status: query.status as ErpFiscalDocumentStatus } : {}),
    };

    if (query.keyword) {
      where.OR = [
        { orderSn: { contains: query.keyword, mode: 'insensitive' } },
        { providerDocumentId: { contains: query.keyword, mode: 'insensitive' } },
        { accessKey: { contains: query.keyword, mode: 'insensitive' } },
        { number: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    return where;
  }

  private toDocumentItem(item: FiscalDocumentRow) {
    return {
      id: item.id,
      provider: item.provider,
      type: item.type,
      status: item.status,
      shopId: item.shopId,
      orderSn: item.orderSn,
      providerDocumentId: item.providerDocumentId,
      accessKey: item.accessKey,
      number: item.number,
      series: item.series,
      issueDate: item.issueDate?.toISOString(),
      totalAmount: item.totalAmount?.toString(),
      currency: item.currency,
      xmlAvailable: item.xmlAvailable,
      pdfAvailable: item.pdfAvailable,
      lastSyncedAt: item.lastSyncedAt?.toISOString(),
      errorMessage: item.errorMessage,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private onlyDigits(input: string) {
    return input.replace(/\D/g, '');
  }

  private assertFocusUnsupported(feature: string): never {
    throw new ConflictException(
      `Fiscal ${feature} is not available for Focus NFe.`,
    );
  }

  private optionalString(input: unknown): string | undefined {
    if (input === undefined || input === null || input === '') return undefined;
    return String(input);
  }

  private optionalDecimal(input: unknown): Prisma.Decimal | undefined {
    if (input === undefined || input === null || input === '') return undefined;
    return new Prisma.Decimal(String(input));
  }

  private optionalDate(input: unknown): Date | undefined {
    if (input === undefined || input === null || input === '') return undefined;
    const date = new Date(String(input));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private mapDocumentStatus(raw: Record<string, unknown>): ErpFiscalDocumentStatus {
    const value = String(raw.status ?? raw.situacao ?? raw.state ?? '').toLowerCase();
    if (['authorized', 'autorizada', 'autorizado', 'autorizado_uso', 'success'].includes(value)) {
      return ErpFiscalDocumentStatus.AUTHORIZED;
    }
    if (['processing', 'processando', 'processando_autorizacao', 'pending'].includes(value)) {
      return ErpFiscalDocumentStatus.PROCESSING;
    }
    if (['rejected', 'rejeitada', 'rejeitado', 'erro_autorizacao'].includes(value)) {
      return ErpFiscalDocumentStatus.REJECTED;
    }
    if (['cancelled', 'canceled', 'cancelada', 'cancelado'].includes(value)) {
      return ErpFiscalDocumentStatus.CANCELLED;
    }
    if (['failed', 'erro', 'error'].includes(value)) {
      return ErpFiscalDocumentStatus.FAILED;
    }
    return raw.chave_nfe || raw.chave || raw.chave_acesso || raw.access_key
      ? ErpFiscalDocumentStatus.AUTHORIZED
      : ErpFiscalDocumentStatus.UNKNOWN;
  }

  private toJson(input: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
  }

  private resolveDownloadPath(
    document: { provider: string; type: string; providerDocumentId: string | null; raw?: Prisma.JsonValue | null },
    artifact: 'xml' | 'pdf',
  ) {
    if (document.provider === 'FOCUS_NFE') {
      const raw = document.raw && typeof document.raw === 'object' && !Array.isArray(document.raw)
        ? (document.raw as Record<string, unknown>)
        : {};
      const path = artifact === 'xml'
        ? raw.caminho_xml_nota_fiscal
        : raw.caminho_danfe ?? raw.caminho_pdf;
      if (typeof path === 'string' && path) return path;
      return `/v2/${document.type.toLowerCase()}/${document.providerDocumentId}`;
    }

    return `/${document.type.toLowerCase()}/${document.providerDocumentId}/${artifact}`;
  }
}
