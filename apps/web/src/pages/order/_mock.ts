import type { Request, Response } from 'express';
import {
  applyOrderOperation,
  deleteRule,
  mockGetOrderDetail,
  mockGetRuleDetail,
  mockQueryAbnormalOrders,
  mockQueryAfterSales,
  mockQueryLogisticsOrders,
  mockQueryLogs,
  mockQueryOrders,
  mockQueryRules,
  mockQueryWarehouseOrders,
  saveRule,
  summarizeOrders,
  toggleRule,
} from '../../services/erp/order.mock';

function getRequestPayload(req: Request) {
  return {
    ...(req.query || {}),
    ...(req.body || {}),
  };
}

function sendList<T>(res: Response, data: API.ListResponse<T>) {
  res.json(data);
}

export default {
  'GET  /api/orders': (req: Request, res: Response) => {
    sendList(res, mockQueryOrders(getRequestPayload(req)));
  },
  'GET  /api/orders/overview': (req: Request, res: Response) => {
    res.json({
      success: true,
      data: summarizeOrders(String(req.query.currentTab || '')),
    });
  },
  'GET  /api/orders/:id': (req: Request, res: Response) => {
    res.json({
      success: true,
      data: mockGetOrderDetail(String(req.params.id)),
    });
  },
  'GET  /api/abnormal-orders': (req: Request, res: Response) => {
    sendList(res, mockQueryAbnormalOrders(getRequestPayload(req)));
  },
  'GET  /api/logistics-orders': (req: Request, res: Response) => {
    sendList(res, mockQueryLogisticsOrders(getRequestPayload(req)));
  },
  'GET  /api/warehouse-orders': (req: Request, res: Response) => {
    sendList(res, mockQueryWarehouseOrders(getRequestPayload(req)));
  },
  'GET  /api/after-sales': (req: Request, res: Response) => {
    sendList(res, mockQueryAfterSales(getRequestPayload(req)));
  },
  'GET  /api/logs': (req: Request, res: Response) => {
    sendList(res, mockQueryLogs(getRequestPayload(req)));
  },
  'GET  /api/rules': (req: Request, res: Response) => {
    sendList(res, mockQueryRules(getRequestPayload(req)));
  },
  'GET  /api/rules/:id': (req: Request, res: Response) => {
    res.json({
      success: true,
      data: mockGetRuleDetail(String(req.params.id)),
    });
  },
  'POST  /api/rules': (req: Request, res: Response) => {
    res.json(saveRule(req.body));
  },
  'POST  /api/rules/:id/toggle': (req: Request, res: Response) => {
    res.json(toggleRule(String(req.params.id)));
  },
  'POST  /api/rules/:id/delete': (req: Request, res: Response) => {
    res.json(deleteRule(String(req.params.id)));
  },
  'POST  /api/orders/audit': (req: Request, res: Response) => res.json(applyOrderOperation('audit', req.body)),
  'POST  /api/orders/reverse-audit': (req: Request, res: Response) =>
    res.json(applyOrderOperation('reverse-audit', req.body)),
  'POST  /api/orders/remark': (req: Request, res: Response) => res.json(applyOrderOperation('remark', req.body)),
  'POST  /api/orders/address/update': (req: Request, res: Response) =>
    res.json(applyOrderOperation('address/update', req.body)),
  'POST  /api/orders/lock': (req: Request, res: Response) => res.json(applyOrderOperation('lock', req.body)),
  'POST  /api/orders/unlock': (req: Request, res: Response) => res.json(applyOrderOperation('unlock', req.body)),
  'POST  /api/orders/split': (req: Request, res: Response) => res.json(applyOrderOperation('split', req.body)),
  'POST  /api/orders/merge': (req: Request, res: Response) => res.json(applyOrderOperation('merge', req.body)),
  'POST  /api/orders/assign-warehouse': (req: Request, res: Response) =>
    res.json(applyOrderOperation('assign-warehouse', req.body)),
  'POST  /api/orders/reassign-warehouse': (req: Request, res: Response) =>
    res.json(applyOrderOperation('reassign-warehouse', req.body)),
  'POST  /api/orders/warehouse-lock': (req: Request, res: Response) =>
    res.json(applyOrderOperation('warehouse-lock', req.body)),
  'POST  /api/orders/warehouse-unlock': (req: Request, res: Response) =>
    res.json(applyOrderOperation('warehouse-unlock', req.body)),
  'POST  /api/orders/select-logistics': (req: Request, res: Response) =>
    res.json(applyOrderOperation('select-logistics', req.body)),
  'POST  /api/orders/assign-logistics-channel': (req: Request, res: Response) =>
    res.json(applyOrderOperation('assign-logistics-channel', req.body)),
  'POST  /api/orders/generate-waybill': (req: Request, res: Response) =>
    res.json(applyOrderOperation('generate-waybill', req.body)),
  'POST  /api/orders/mark-logistics-assigned': (req: Request, res: Response) =>
    res.json(applyOrderOperation('mark-logistics-assigned', req.body)),
  'POST  /api/orders/rematch-logistics': (req: Request, res: Response) =>
    res.json(applyOrderOperation('rematch-logistics', req.body)),
  'POST  /api/orders/mark-shipped': (req: Request, res: Response) =>
    res.json(applyOrderOperation('mark-shipped', req.body)),
  'POST  /api/orders/cancel': (req: Request, res: Response) => res.json(applyOrderOperation('cancel', req.body)),
  'POST  /api/orders/manual-sync': (req: Request, res: Response) =>
    res.json(applyOrderOperation('manual-sync', req.body)),
  'POST  /api/orders/after-sale': (req: Request, res: Response) =>
    res.json(applyOrderOperation('after-sale', req.body)),
  'POST  /api/orders/tag': (req: Request, res: Response) => res.json(applyOrderOperation('tag', req.body)),
  'POST  /api/orders/manual-review': (req: Request, res: Response) =>
    res.json(applyOrderOperation('manual-review', req.body)),
  'POST  /api/orders/recheck': (req: Request, res: Response) =>
    res.json(applyOrderOperation('recheck', req.body)),
  'POST  /api/orders/ignore-abnormal': (req: Request, res: Response) =>
    res.json(applyOrderOperation('ignore-abnormal', req.body)),
};
