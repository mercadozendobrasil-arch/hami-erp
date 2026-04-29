import { Body, Controller, Param, Post } from '@nestjs/common';

import {
  ErpOrderAfterSaleDto,
  ErpOrderAuditDto,
  ErpOrderCancelDto,
  ErpOrderExceptionBatchDto,
  ErpOrderLockDto,
  ErpOrderLogisticsDto,
  ErpOrderMergeDto,
  ErpOrderNoteDto,
  ErpOrderSplitDto,
  ErpOrderTagsDto,
  ErpOrderWarehouseDto,
} from './dto/erp-order-action.dto';
import { ErpOrderActionsService } from './erp-order-actions.service';

@Controller('erp/orders')
export class ErpOrderActionsController {
  constructor(private readonly erpOrderActionsService: ErpOrderActionsService) {}

  @Post(':orderSn/note')
  updateNote(@Param('orderSn') orderSn: string, @Body() payload: ErpOrderNoteDto) {
    return this.erpOrderActionsService.updateNote(orderSn, payload);
  }

  @Post(':orderSn/lock')
  lockOrder(@Param('orderSn') orderSn: string, @Body() payload: ErpOrderLockDto) {
    return this.erpOrderActionsService.lockOrder(orderSn, payload);
  }

  @Post(':orderSn/unlock')
  unlockOrder(@Param('orderSn') orderSn: string, @Body() payload: ErpOrderLockDto) {
    return this.erpOrderActionsService.unlockOrder(orderSn, payload);
  }

  @Post(':orderSn/audit')
  auditOrder(@Param('orderSn') orderSn: string, @Body() payload: ErpOrderAuditDto) {
    return this.erpOrderActionsService.auditOrder(orderSn, payload);
  }

  @Post(':orderSn/reverse-audit')
  reverseAuditOrder(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpOrderAuditDto,
  ) {
    return this.erpOrderActionsService.reverseAuditOrder(orderSn, payload);
  }

  @Post(':orderSn/cancel')
  cancelOrder(@Param('orderSn') orderSn: string, @Body() payload: ErpOrderCancelDto) {
    return this.erpOrderActionsService.cancelOrder(orderSn, payload);
  }

  @Post(':orderSn/assign-warehouse')
  assignWarehouse(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpOrderWarehouseDto,
  ) {
    return this.erpOrderActionsService.assignWarehouse(orderSn, payload);
  }

  @Post(':orderSn/select-logistics')
  selectLogistics(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpOrderLogisticsDto,
  ) {
    return this.erpOrderActionsService.selectLogistics(orderSn, payload);
  }

  @Post(':orderSn/tags')
  updateTags(@Param('orderSn') orderSn: string, @Body() payload: ErpOrderTagsDto) {
    return this.erpOrderActionsService.updateTags(orderSn, payload);
  }

  @Post(':orderSn/after-sale')
  createAfterSale(
    @Param('orderSn') orderSn: string,
    @Body() payload: ErpOrderAfterSaleDto,
  ) {
    return this.erpOrderActionsService.createAfterSale(orderSn, payload);
  }

  @Post(':orderSn/split')
  splitOrder(@Param('orderSn') orderSn: string, @Body() payload: ErpOrderSplitDto) {
    return this.erpOrderActionsService.splitOrder(orderSn, payload);
  }

  @Post('merge')
  mergeOrders(@Body() payload: ErpOrderMergeDto) {
    return this.erpOrderActionsService.mergeOrders(payload);
  }

  @Post('exceptions/manual-review')
  transferExceptionsToManualReview(@Body() payload: ErpOrderExceptionBatchDto) {
    return this.erpOrderActionsService.transferExceptionsToManualReview(payload);
  }

  @Post('exceptions/recheck')
  recheckExceptions(@Body() payload: ErpOrderExceptionBatchDto) {
    return this.erpOrderActionsService.recheckExceptions(payload);
  }

  @Post('exceptions/ignore')
  ignoreExceptions(@Body() payload: ErpOrderExceptionBatchDto) {
    return this.erpOrderActionsService.ignoreExceptions(payload);
  }

  @Post('exceptions/resolve')
  resolveExceptions(@Body() payload: ErpOrderExceptionBatchDto) {
    return this.erpOrderActionsService.resolveExceptions(payload);
  }
}
