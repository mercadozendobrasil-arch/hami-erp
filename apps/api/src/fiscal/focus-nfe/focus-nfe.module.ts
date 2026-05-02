import { Module } from '@nestjs/common';

import { FocusNfeHttpService } from './focus-nfe-http.service';

@Module({
  providers: [FocusNfeHttpService],
  exports: [FocusNfeHttpService],
})
export class FocusNfeModule {}
