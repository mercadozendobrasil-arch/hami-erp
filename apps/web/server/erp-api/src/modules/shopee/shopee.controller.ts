import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ShopeeService } from './shopee.service';

@Controller('api/shopee')
export class ShopeeController {
  private readonly logger = new Logger(ShopeeController.name);

  constructor(private readonly shopeeService: ShopeeService) {}

  @Get('auth/url')
  getAuthorizationUrl() {
    return this.shopeeService.getAuthorizationUrl();
  }

  @Get('push')
  handlePushVerification(@Query() query: Record<string, unknown>) {
    this.logger.log(`Shopee push verification received: ${JSON.stringify(query)}`);
    return {
      success: true,
    };
  }

  @Post('push')
  @HttpCode(HttpStatus.OK)
  async handlePushCallback(
    @Query() query: Record<string, unknown>,
    @Body() body: Record<string, unknown>,
    @Req() req: {
      headers: Record<string, unknown>;
      rawBody?: Buffer | string;
    },
  ) {
    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : Buffer.isBuffer(req.rawBody)
          ? req.rawBody.toString('utf8')
          : undefined;

    this.logger.log(`Shopee push callback received | query=${JSON.stringify(query)}`);

    return this.shopeeService.handlePushCallback({
      query,
      body,
      headers: req.headers,
      rawBody,
    });
  }

  @Post('orders/sync/detail')
  syncOrderDetail(
    @Body()
    body: {
      orderId?: string;
      orderIds?: string[];
      orderNo?: string;
      orderNos?: string[];
      shopId?: string;
    },
  ) {
    return this.shopeeService.syncOrderDetails(body);
  }

  @Post('orders/sync/status')
  syncOrderStatus(
    @Body()
    body: {
      orderId?: string;
      orderIds?: string[];
      orderNo?: string;
      orderNos?: string[];
      shopId?: string;
      days?: number;
      limit?: number;
    },
  ) {
    return this.shopeeService.syncOrderStatuses(body);
  }

  @Post('orders/sync/recent')
  syncRecentOrderDetails(
    @Body()
    body: {
      shopId?: string;
      days?: number;
      limit?: number;
    },
  ) {
    return this.shopeeService.syncRecentOrderDetails(body);
  }

  @Post('orders/invoice/add')
  addInvoiceData(
    @Body()
    body: {
      orderId?: string;
      orderIds?: string[];
      orderNo?: string;
      orderSn?: string;
      orderNos?: string[];
      shopId?: string;
      packageNumber?: string;
      invoiceData?: Record<string, unknown>;
    },
  ) {
    return this.shopeeService.addInvoiceData(body);
  }

  @Post('orders/shipping-document/create')
  createShippingDocument(
    @Body()
    body: {
      orderId?: string;
      orderIds?: string[];
      orderNo?: string;
      orderNos?: string[];
      shopId?: string;
      packageNumber?: string;
      packageNumbers?: string[];
      shippingDocumentType?: string;
    },
  ) {
    return this.shopeeService.createShippingDocument(body);
  }

  @Get('orders/shipping-parameter')
  getShippingParameter(
    @Query('shopId') shopId?: string,
    @Query('orderId') orderId?: string,
    @Query('orderNo') orderNo?: string,
    @Query('orderSn') orderSn?: string,
    @Query('packageNumber') packageNumber?: string,
  ) {
    return this.shopeeService.getShippingParameter({
      shopId,
      orderId,
      orderNo,
      orderSn,
      packageNumber,
    });
  }

  @Post('orders/shipping-parameter/mass')
  getMassShippingParameter(
    @Body()
    body: {
      shopId?: string;
      orderId?: string;
      orderIds?: string[];
      orderNo?: string;
      orderNos?: string[];
      orderSn?: string;
      packageNumber?: string;
      packageNumbers?: string[];
      logisticsChannelId?: number;
      productLocationId?: string;
      packages?: Array<{
        orderSn?: string;
        orderNo?: string;
        packageNumber?: string;
      }>;
    },
  ) {
    return this.shopeeService.getMassShippingParameter(body);
  }

  @Post('orders/ship')
  shipOrder(
    @Body()
    body: {
      shopId?: string;
      orderId?: string;
      orderNo?: string;
      orderSn?: string;
      packageNumber?: string;
      trackingNo?: string;
      pickup?: {
        addressId?: number;
        pickupTimeId?: string;
        trackingNumber?: string;
      };
      dropoff?: {
        branchId?: number;
        senderRealName?: string;
        trackingNumber?: string;
      };
      nonIntegrated?: {
        trackingNumber?: string;
      };
    },
  ) {
    return this.shopeeService.shipOrder(body);
  }

  @Post('orders/ship/batch')
  batchShipOrder(
    @Body()
    body: {
      shopId?: string;
      orderId?: string;
      orderIds?: string[];
      orderNo?: string;
      orderNos?: string[];
      orderSn?: string;
      packageNumber?: string;
      packageNumbers?: string[];
      trackingNo?: string;
      pickup?: {
        addressId?: number;
        pickupTimeId?: string;
        trackingNumber?: string;
      };
      dropoff?: {
        branchId?: number;
        senderRealName?: string;
        trackingNumber?: string;
      };
      nonIntegrated?: {
        trackingNumber?: string;
      };
      orderList?: Array<{
        orderSn?: string;
        packageNumber?: string;
      }>;
    },
  ) {
    return this.shopeeService.batchShipOrder(body);
  }

  @Post('orders/ship/mass')
  massShipOrder(
    @Body()
    body: {
      shopId?: string;
      orderId?: string;
      orderIds?: string[];
      orderNo?: string;
      orderNos?: string[];
      packageNumber?: string;
      packageNumbers?: string[];
      logisticsChannelId?: number;
      productLocationId?: string;
      trackingNo?: string;
      pickup?: {
        addressId?: number;
        pickupTimeId?: string;
      };
      dropoff?: {
        branchId?: number;
        senderRealName?: string;
        trackingNumber?: string;
      };
      nonIntegrated?: {
        trackingList?: Array<{
          packageNumber: string;
          trackingNumber: string;
        }>;
      };
      packages?: Array<{
        orderSn?: string;
        orderNo?: string;
        packageNumber?: string;
      }>;
    },
  ) {
    return this.shopeeService.massShipOrder(body);
  }

  @Get('orders/tracking-number')
  getTrackingNumber(
    @Query('shopId') shopId?: string,
    @Query('orderId') orderId?: string,
    @Query('orderNo') orderNo?: string,
    @Query('orderSn') orderSn?: string,
    @Query('packageNumber') packageNumber?: string,
    @Query('responseOptionalFields') responseOptionalFields?: string,
  ) {
    return this.shopeeService.getTrackingNumber({
      shopId,
      orderId,
      orderNo,
      orderSn,
      packageNumber,
      responseOptionalFields,
    });
  }

  @Post('orders/tracking-number/mass')
  getMassTrackingNumber(
    @Body()
    body: {
      shopId?: string;
      orderId?: string;
      orderIds?: string[];
      orderNo?: string;
      orderNos?: string[];
      packageNumber?: string;
      packageNumbers?: string[];
      responseOptionalFields?: string;
      packages?: Array<{
        orderSn?: string;
        orderNo?: string;
        packageNumber?: string;
      }>;
    },
  ) {
    return this.shopeeService.getMassTrackingNumber(body);
  }

  @Get('orders/shipping-document/parameter')
  getShippingDocumentParameter(
    @Query('shopId') shopId?: string,
    @Query('orderId') orderId?: string,
    @Query('orderNo') orderNo?: string,
    @Query('orderSn') orderSn?: string,
    @Query('packageNumber') packageNumber?: string,
  ) {
    return this.shopeeService.getShippingDocumentParameter({
      shopId,
      orderId,
      orderNo,
      orderSn,
      packageNumber,
    });
  }

  @Post('orders/shipping/update')
  updateShippingOrder(
    @Body()
    body: {
      shopId?: string;
      orderId?: string;
      orderNo?: string;
      orderSn?: string;
      packageNumber?: string;
      pickup?: {
        addressId?: number;
        pickupTimeId?: string;
      };
    },
  ) {
    return this.shopeeService.updateShippingOrder(body);
  }

  @Post('orders/shipping-document/result')
  syncShippingDocumentResult(
    @Body()
    body: {
      orderId?: string;
      orderIds?: string[];
      orderNo?: string;
      orderNos?: string[];
      shopId?: string;
      packageNumber?: string;
      packageNumbers?: string[];
      shippingDocumentType?: string;
    },
  ) {
    return this.shopeeService.syncShippingDocumentResult(body);
  }

  @Get('orders/sync/logs')
  getOrderSyncLogs(
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
    @Query('shopId') shopId?: string,
    @Query('orderNo') orderNo?: string,
    @Query('orderSn') orderSn?: string,
    @Query('packageNumber') packageNumber?: string,
    @Query('triggerType')
    triggerType?:
      | 'manual_detail'
      | 'manual_status'
      | 'sync_recent'
      | 'webhook'
      | 'invoice_add'
      | 'shipping_parameter'
      | 'shipping_parameter_mass'
      | 'ship'
      | 'ship_batch'
      | 'ship_mass'
      | 'tracking_sync'
      | 'tracking_sync_mass'
      | 'shipping_update',
    @Query('resultStatus') resultStatus?: 'success' | 'partial' | 'failed',
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.shopeeService.getOrderSyncLogs({
      current: current ? Number(current) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      shopId,
      orderNo,
      orderSn,
      packageNumber,
      triggerType,
      resultStatus,
      startTime,
      endTime,
    });
  }

  @Get('orders/package-context')
  getPackageContext(@Query('packageNumber') packageNumber?: string) {
    return this.shopeeService.getPackageContext(packageNumber);
  }

  @Get('orders/shipping-document/download')
  async downloadShippingDocument(
    @Query('packageNumber') packageNumber: string | undefined,
    @Query('shippingDocumentType') shippingDocumentType: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.shopeeService.downloadShippingDocument({
      packageNumber,
      shippingDocumentType,
    });

    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    );

    return res.send(file.buffer);
  }

  @Get('auth/callback')
  async handleCallback(
    @Query('code') code: string | undefined,
    @Query('shop_id') shopId: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const result = await this.shopeeService.handleAuthorizationCallback({
        code,
        shopId,
      });

      return res.redirect(result.redirectUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Shopee authorization failed';
      this.logger.error(
        `Shopee auth callback failed for shop ${shopId ?? '-'}: ${message}`,
      );
      const redirectUrl = this.shopeeService.buildAuthorizationFailureRedirect({
        shopId,
        message,
      });

      return res.redirect(HttpStatus.FOUND, redirectUrl);
    }
  }
}
