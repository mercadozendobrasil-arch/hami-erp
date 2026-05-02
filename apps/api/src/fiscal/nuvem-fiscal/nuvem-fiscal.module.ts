import { Module } from '@nestjs/common';

import { NuvemFiscalAuthService } from './nuvem-fiscal-auth.service';
import { NuvemFiscalHttpService } from './nuvem-fiscal-http.service';

@Module({
  providers: [NuvemFiscalAuthService, NuvemFiscalHttpService],
  exports: [NuvemFiscalAuthService, NuvemFiscalHttpService],
})
export class NuvemFiscalModule {}
