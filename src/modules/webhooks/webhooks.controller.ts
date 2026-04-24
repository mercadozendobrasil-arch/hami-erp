import { Body, Controller, Headers, Post, Req } from '@nestjs/common';

import { RawBodyRequest } from 'src/common/raw-body-request.interface';

import { WebhooksService } from './webhooks.service';

@Controller('shopee/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  ingestWebhook(
    @Req() request: RawBodyRequest,
    @Body() payload: Record<string, unknown>,
    @Headers('x-shopee-hmac-sha256') hmacSignature?: string,
    @Headers('x-shopee-signature') webhookSignature?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.webhooksService.ingestWebhook({
      signature: hmacSignature ?? webhookSignature ?? authorization,
      rawBody: request.rawBody,
      payload,
    });
  }
}
