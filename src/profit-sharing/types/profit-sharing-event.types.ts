/**
 * 分润模块监听与触发的相关领域事件 Payload 类型定义
 */

/**
 * 订单财务核算完成事件 Payload (order.financial_closed)
 */
export interface OrderFinancialClosedEventPayload {
  orderId: string;
}

/**
 * 订单退款事件 Payload (order.refunded)
 */
export interface OrderRefundedEventPayload {
  orderId: string;
  refundAmount: number;
}
