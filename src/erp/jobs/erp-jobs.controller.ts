import { Controller, Get, Param, Query } from '@nestjs/common';

import { ErpJobsService } from './erp-jobs.service';

@Controller('erp/jobs')
export class ErpJobsController {
  constructor(private readonly erpJobsService: ErpJobsService) {}

  @Get()
  listJobs(@Query('domain') domain?: string) {
    return this.erpJobsService.listJobs(domain);
  }

  @Get(':jobId')
  getJob(@Param('jobId') jobId: string) {
    return this.erpJobsService.getJob(jobId);
  }
}
