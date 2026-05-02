import { Controller, Get, Query } from '@nestjs/common';

import { ErpSyncLogQueryDto } from './dto/erp-sync-log-query.dto';
import { ErpSyncLogsService } from './erp-sync-logs.service';

@Controller('erp/sync-logs')
export class ErpSyncLogsController {
  constructor(private readonly erpSyncLogsService: ErpSyncLogsService) {}

  @Get()
  listSyncLogs(@Query() query: ErpSyncLogQueryDto) {
    return this.erpSyncLogsService.listSyncLogs(query);
  }
}
