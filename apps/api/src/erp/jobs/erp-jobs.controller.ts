import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequireErpPermissions } from 'src/common/auth/erp-permissions.decorator';
import { ErpApiTokenGuard } from 'src/common/guards/erp-api-token.guard';

import { ErpJobsService } from './erp-jobs.service';

@ApiTags('erp-jobs')
@ApiBearerAuth()
@UseGuards(ErpApiTokenGuard)
@RequireErpPermissions('erp.jobs.read')
@Controller('erp')
export class ErpJobsController {
  constructor(private readonly erpJobsService: ErpJobsService) {}

  @Get('jobs')
  listJobs(@Query('domain') domain?: string) {
    return this.erpJobsService.listJobs(domain);
  }

  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string) {
    return this.erpJobsService.getJob(jobId);
  }

  @Get('tasks/:taskId')
  getTask(@Param('taskId') taskId: string) {
    return this.erpJobsService.getProcess(taskId);
  }

  @Get('check-process')
  checkProcess(@Query('uuid') uuid: string) {
    return this.erpJobsService.getProcess(uuid);
  }
}
