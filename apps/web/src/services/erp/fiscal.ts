import { request } from '@umijs/max';

export async function queryFiscalHealth() {
  return request<ERP.ApiResponse<ERP.FiscalHealth>>('/api/erp/fiscal/health', {
    method: 'GET',
  });
}

export async function queryFiscalCep(cep: string) {
  return request<ERP.ApiResponse<ERP.FiscalAddress>>(`/api/erp/fiscal/cep/${cep}`, {
    method: 'GET',
  });
}

export async function queryFiscalCnpj(cnpj: string) {
  return request<ERP.ApiResponse<ERP.FiscalCompanyLookup>>(
    `/api/erp/fiscal/cnpj/${cnpj}`,
    {
      method: 'GET',
    },
  );
}

export async function queryFiscalQuotas() {
  return request<ERP.ApiResponse<Record<string, unknown>>>('/api/erp/fiscal/quotas', {
    method: 'GET',
  });
}

export async function queryFiscalCompany(cpfCnpj: string) {
  return request<ERP.ApiResponse<Record<string, unknown>>>(
    `/api/erp/fiscal/companies/${cpfCnpj}`,
    {
      method: 'GET',
    },
  );
}

export async function queryFiscalDocuments(params: ERP.FiscalDocumentQueryParams) {
  return request<API.ListResponse<ERP.FiscalDocumentItem>>(
    '/api/erp/fiscal/documents',
    {
      method: 'GET',
      params,
    },
  );
}

export async function queryFiscalDocument(id: string) {
  return request<ERP.ApiResponse<ERP.FiscalDocumentDetail>>(
    `/api/erp/fiscal/documents/${id}`,
    {
      method: 'GET',
    },
  );
}

export function getFiscalDocumentXmlUrl(id: string) {
  return `/api/erp/fiscal/documents/${id}/xml`;
}

export function getFiscalDocumentPdfUrl(id: string) {
  return `/api/erp/fiscal/documents/${id}/pdf`;
}
