import { OrderStatus } from '@prisma/client';


export function mapWechatShopStatus(
  status: number | undefined,
): OrderStatus | undefined {
  switch (status) {
    case 10:
    case 12:
    case 13:
      return OrderStatus.UNPAID;
    case 17:
    case 20:
    case 21:
    case 30:
      return OrderStatus.PAID;
    case 100:
      return OrderStatus.COMPLETED;
    case 200:
    case 250:
      return OrderStatus.CANCELLED;
    default:
      return undefined;
  }
}
