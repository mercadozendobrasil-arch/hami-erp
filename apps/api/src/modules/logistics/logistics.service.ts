import { Injectable } from '@nestjs/common';

import { LogisticsSdk } from '../../shopee-sdk/modules/logistics.sdk';
import { ShopeeBusinessContext } from '../../common/shopee/shopee.types';
import { UpdateShippingInfoDto } from './dto/update-shipping-info.dto';

@Injectable()
export class LogisticsService {
  constructor(private readonly logisticsSdk: LogisticsSdk) {}

  getChannelList(context: ShopeeBusinessContext) {
    return this.logisticsSdk.getChannelList(context);
  }

  getShippingParameter(context: ShopeeBusinessContext, itemId: number) {
    return this.logisticsSdk.getShippingParameter(context, itemId);
  }

  updateShippingInfo(
    context: ShopeeBusinessContext,
    itemId: number,
    payload: UpdateShippingInfoDto,
  ) {
    return this.logisticsSdk.updateShippingInfo(context, itemId, payload);
  }
}
