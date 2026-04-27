import { Controller, Get, Param, Query } from '@nestjs/common';

import { ErpJobsService } from './erp-jobs.service';

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
