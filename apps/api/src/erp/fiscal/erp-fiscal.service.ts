import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErpFiscalDocumentStatus,
  ErpFiscalDocumentType,
  Prisma,
} from '@prisma/client';

import { erpData } from '../common/erp-response';
import { NuvemFiscalHttpService } from '../../fiscal/nuvem-fiscal/nuvem-fiscal-http.service';
import { PrismaService } from '../../infra/database/prisma.service';

import { ErpFiscalDocumentQueryDto } from './dto/erp-fiscal.dto';

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
    private readonly nuvemFiscalHttpService: NuvemFiscalHttpService,
    private readonly prismaService: PrismaService,
  ) {}

  getHealth() {
    const clientId = this.configService.get<string>('NUVEM_FISCAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('NUVEM_FISCAL_CLIENT_SECRET');
    const scopes = this.configService
      .get<string>('NUVEM_FISCAL_SCOPES', 'empresa cep cnpj')
      .split(/\s+/)
      .filter(Boolean);

    return erpData({
      provider: 'NUVEM_FISCAL',
      environment: this.nuvemFiscalHttpService.getEnvironment(),
      scopes,
      credentialsConfigured: Boolean(clientId && clientSecret),
    });
  }

  async lookupCep(cep: string) {
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
    return erpData(await this.nuvemFiscalHttpService.get('/conta/cotas'));
  }

  async getCompany(cpfCnpj: string) {
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

    const file = await this.nuvemFiscalHttpService.download(
      `/${document.type.toLowerCase()}/${document.providerDocumentId}/${artifact}`,
    );

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

  private optionalString(input: unknown): string | undefined {
    if (input === undefined || input === null || input === '') return undefined;
    return String(input);
  }
}
