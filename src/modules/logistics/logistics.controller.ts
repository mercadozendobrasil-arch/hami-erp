import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UpdateShippingInfoDto } from './dto/update-shipping-info.dto';
import { LogisticsService } from './logistics.service';

@ApiTags('shopee-logistics')
@Controller('shopee/shops/:shopId/logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Get('channels')
  getChannels(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('accessToken') accessToken: string,
  ) {
    return this.logisticsService.getChannelList({ shopId, accessToken });
  }

  @Get('items/:itemId/shipping-parameter')
  getShippingParameter(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query('accessToken') accessToken: string,
  ) {
    return this.logisticsService.getShippingParameter(
      { shopId, accessToken },
      itemId,
    );
  }

  @Put('items/:itemId/shipping-info')
  updateShippingInfo(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() payload: UpdateShippingInfoDto,
    @Query('accessToken') accessToken: string,
  ) {
    return this.logisticsService.updateShippingInfo(
      { shopId, accessToken },
      itemId,
      payload,
    );
  }
}
