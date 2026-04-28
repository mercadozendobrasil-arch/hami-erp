import { SetMetadata } from '@nestjs/common';

import {
  ERP_API_PERMISSION_METADATA_KEY,
  ErpApiPermission,
} from './erp-api-access.types';

export const RequireErpPermissions = (...permissions: ErpApiPermission[]) =>
  SetMetadata(ERP_API_PERMISSION_METADATA_KEY, permissions);
