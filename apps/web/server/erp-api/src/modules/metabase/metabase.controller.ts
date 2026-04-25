import { Body, Controller, Get, Post } from '@nestjs/common';
import { MetabaseService } from './metabase.service';

@Controller('api/metabase/embed')
export class MetabaseController {
  constructor(private readonly metabaseService: MetabaseService) {}

  @Get('config')
  getConfig() {
    return {
      success: true,
      data: this.metabaseService.getEmbedConfig(),
    };
  }

  @Post('dashboard')
  buildDashboardEmbedUrl(
    @Body()
    body: {
      dashboardId?: string;
      params?: Record<string, unknown>;
      options?: {
        bordered?: boolean;
        titled?: boolean;
        theme?: 'light' | 'night';
        refreshSeconds?: number;
      };
    },
  ) {
    return {
      success: true,
      data: this.metabaseService.buildDashboardEmbedUrl(body),
    };
  }
}
