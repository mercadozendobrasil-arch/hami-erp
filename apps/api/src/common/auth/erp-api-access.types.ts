export const ERP_API_PERMISSION_METADATA_KEY = 'erp-api-permissions';

export const ERP_API_PERMISSIONS = [
  'erp.read',
  'erp.write',
  'erp.jobs.read',
] as const;

export type ErpApiPermission = (typeof ERP_API_PERMISSIONS)[number];

export interface ErpApiAccessCredential {
  role: string;
  token: string;
  permissions: ErpApiPermission[];
}
