import { PageQueryDto } from '../../common/dto/page-query.dto';
import { OrdersService } from './orders.service';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    findMany(query: PageQueryDto, shopId?: string, orderNo?: string, packageNumber?: string, orderStatus?: string, currentTab?: string): Promise<{
        data: {
            id: string;
            channel: string;
            siteCode: string;
            shopId: string;
            shopName: string;
            orderNo: string;
            createdAtRemote: string | null;
            updatedAt: string;
            order_sn: string;
            region: string;
            currency: string;
            total_amount: string;
            order_status: string;
            audit_status: string | null;
            buyer_name: string | null;
            buyer_username: string | null;
            buyer_user_id: number | undefined;
            message_to_seller: string | null;
            payment_method: string | null;
            shipping_carrier: string | null;
            checkout_shipping_carrier: string | null;
            create_time: number | undefined;
            update_time: number | undefined;
            days_to_ship: number | undefined;
            ship_by_date: number | undefined;
            estimated_shipping_fee: number | undefined;
            actual_shipping_fee: number | undefined;
            recipient_address: {
                [x: string]: unknown;
            } | null;
            cancel_by: string | null;
            cancel_reason: string | null;
            buyer_cancel_reason: string | null;
            buyer_cpf_id: string | null;
            buyer_cnpj_id: string | null;
            fulfillment_flag: string | null;
            pickup_done_time: number | undefined;
            package_list: {
                [x: string]: unknown;
            }[];
            package_number: string | null;
            tracking_number: string | undefined;
            reverse_shipping_fee: number | undefined;
            order_chargeable_weight_gram: number | undefined;
            return_request_due_date: number | undefined;
            edt_from: number | undefined;
            edt_to: number | undefined;
            payment_info: any[];
            invoice_data: {
                [x: string]: unknown;
            } | null;
            note: string | null;
            item_list: any[];
            pending_terms: any[];
            raw_source: string;
            sync_meta: {
                last_sync_time: string;
                last_trigger_type: string;
                last_result: string;
                last_message: string | null;
                detail_source: string;
                package_source: string;
                payment_source: string;
                invoice_source: string;
                address_source: string;
                status_source: string;
                fallback_fields: any[];
            };
        }[];
        total: number;
        success: boolean;
        current: number;
        pageSize: number;
    }>;
    getOverview(shopId?: string, currentTab?: string): Promise<{
        success: boolean;
        data: {
            total: number;
            pendingCount: number;
            pendingInvoiceCount: number;
            abnormalCount: number;
            shippedCount: number;
            cancelRefundCount: number;
            lockedCount: number;
            printPendingCount: number;
            logisticsPendingCount: number;
            warehousePendingCount: number;
            unpaidCount: number;
            readyToShipCount: number;
            processedCount: number;
            toConfirmReceiveCount: number;
            inCancelCount: number;
            retryShipCount: number;
            toReturnCount: number;
            cancelledCount: number;
            completedCount: number;
        };
    }>;
    findLogisticsMany(query: PageQueryDto, shopId?: string, orderNo?: string, packageNumber?: string, logisticsChannel?: string, logisticsStatus?: string, shippingDocumentStatus?: string): Promise<{
        data: {
            id: string;
            channel: string;
            siteCode: string;
            shopId: string;
            shopName: string;
            orderNo: string;
            createdAtRemote: string | null;
            updatedAt: string;
            order_sn: string;
            region: string;
            currency: string;
            total_amount: string;
            order_status: string;
            audit_status: string | null;
            buyer_name: string | null;
            buyer_username: string | null;
            buyer_user_id: number | undefined;
            message_to_seller: string | null;
            payment_method: string | null;
            shipping_carrier: string | null;
            checkout_shipping_carrier: string | null;
            create_time: number | undefined;
            update_time: number | undefined;
            days_to_ship: number | undefined;
            ship_by_date: number | undefined;
            estimated_shipping_fee: number | undefined;
            actual_shipping_fee: number | undefined;
            recipient_address: {
                [x: string]: unknown;
            } | null;
            cancel_by: string | null;
            cancel_reason: string | null;
            buyer_cancel_reason: string | null;
            buyer_cpf_id: string | null;
            buyer_cnpj_id: string | null;
            fulfillment_flag: string | null;
            pickup_done_time: number | undefined;
            package_list: {
                [x: string]: unknown;
            }[];
            package_number: string | null;
            tracking_number: string | undefined;
            reverse_shipping_fee: number | undefined;
            order_chargeable_weight_gram: number | undefined;
            return_request_due_date: number | undefined;
            edt_from: number | undefined;
            edt_to: number | undefined;
            payment_info: any[];
            invoice_data: {
                [x: string]: unknown;
            } | null;
            note: string | null;
            item_list: any[];
            pending_terms: any[];
            raw_source: string;
            sync_meta: {
                last_sync_time: string;
                last_trigger_type: string;
                last_result: string;
                last_message: string | null;
                detail_source: string;
                package_source: string;
                payment_source: string;
                invoice_source: string;
                address_source: string;
                status_source: string;
                fallback_fields: any[];
            };
        }[];
        total: number;
        success: boolean;
        current: number;
        pageSize: number;
    }>;
    findPackagePrecheckMany(query: PageQueryDto, shopId?: string, orderNo?: string, orderSn?: string, packageNumber?: string, logisticsProfile?: string, logisticsChannelId?: string, logisticsChannelName?: string, shippingCarrier?: string, packageStatus?: string, logisticsStatus?: string, shippingDocumentStatus?: string, canShip?: string, startTime?: string, endTime?: string, timeField?: string): Promise<{
        data: Record<string, unknown>[];
        total: number;
        success: boolean;
        current: number;
        pageSize: number;
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: {
            id: string;
            channel: string;
            siteCode: string;
            shopId: string;
            shopName: string;
            orderNo: string;
            createdAtRemote: string | null;
            updatedAt: string;
            order_sn: string;
            region: string;
            currency: string;
            total_amount: string;
            order_status: string;
            audit_status: string | null;
            buyer_name: string | null;
            buyer_username: string | null;
            buyer_user_id: number | undefined;
            message_to_seller: string | null;
            payment_method: string | null;
            shipping_carrier: string | null;
            checkout_shipping_carrier: string | null;
            create_time: number | undefined;
            update_time: number | undefined;
            days_to_ship: number | undefined;
            ship_by_date: number | undefined;
            estimated_shipping_fee: number | undefined;
            actual_shipping_fee: number | undefined;
            recipient_address: {
                [x: string]: unknown;
            } | null;
            cancel_by: string | null;
            cancel_reason: string | null;
            buyer_cancel_reason: string | null;
            buyer_cpf_id: string | null;
            buyer_cnpj_id: string | null;
            fulfillment_flag: string | null;
            pickup_done_time: number | undefined;
            package_list: {
                [x: string]: unknown;
            }[];
            package_number: string | null;
            tracking_number: string | undefined;
            reverse_shipping_fee: number | undefined;
            order_chargeable_weight_gram: number | undefined;
            return_request_due_date: number | undefined;
            edt_from: number | undefined;
            edt_to: number | undefined;
            payment_info: any[];
            invoice_data: {
                [x: string]: unknown;
            } | null;
            note: string | null;
            item_list: any[];
            pending_terms: any[];
            raw_source: string;
            sync_meta: {
                last_sync_time: string;
                last_trigger_type: string;
                last_result: string;
                last_message: string | null;
                detail_source: string;
                package_source: string;
                payment_source: string;
                invoice_source: string;
                address_source: string;
                status_source: string;
                fallback_fields: any[];
            };
        };
    }>;
    audit(body: {
        orderId?: string;
        orderIds?: string[];
        orderNo?: string;
        orderNos?: string[];
        orderSn?: string;
        shopId?: string;
    }): Promise<{
        success: boolean;
        data: {
            affected: number;
        };
    }>;
    reverseAudit(body: {
        orderId?: string;
        orderIds?: string[];
        orderNo?: string;
        orderNos?: string[];
        orderSn?: string;
        shopId?: string;
    }): Promise<{
        success: boolean;
        data: {
            affected: number;
        };
    }>;
}
