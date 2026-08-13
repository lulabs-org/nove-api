import { PartialType, PickType } from '@nestjs/swagger';
import { CreateOrderRefundDto } from './create-order-refund.dto';

export class UpdateOrderRefundDto extends PartialType(
  PickType(CreateOrderRefundDto, [
    'orderId',
    'refundChannel',
    'approvalUrl',
    'refundAmount',
    'refundReason',
    'benefitUsedDays',
    'applicantName',
    'financialNote',
    'parentId',
    'productCategory',
    'submittedAt',
  ] as const),
) {}
