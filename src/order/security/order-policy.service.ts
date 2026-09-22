import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { accessibleBy } from '@casl/prisma';
import { subject } from '@casl/ability';
import { Prisma, Order } from '@/generated/prisma/client';
import { AuthContext } from '@/auth/types/auth-context.interface';
import { OrderAbilityFactory } from './order-ability.factory';

@Injectable()
export class OrderPolicyService {
  constructor(private readonly abilityFactory: OrderAbilityFactory) { }

  /**
   * 获取当前用户能够读取的 Order Where 过滤条件
   */
  getAccessibleWhere(auth?: AuthContext | null): Prisma.OrderWhereInput {
    if (!auth) {
      return {};
    }
    const ability = this.abilityFactory.createForUser(auth);
    return accessibleBy(ability, 'read').ofType('Order');
  }

  /**
   * 断言用户是否有权读取该订单
   */
  assertCanRead(order: Order, auth?: AuthContext | null): void {
    if (!auth) return;
    const ability = this.abilityFactory.createForUser(auth);
    if (!ability.can('read', subject('Order', order))) {
      throw new NotFoundException('Order not found');
    }
  }

  /**
   * 断言用户是否有权更新该订单
   */
  assertCanUpdate(order: Order, auth?: AuthContext | null): void {
    if (!auth) return;
    const ability = this.abilityFactory.createForUser(auth);
    if (!ability.can('update', subject('Order', order))) {
      if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
        throw new ForbiddenException(`订单处于 ${order.status} 状态，不可修改`);
      }
      throw new ForbiddenException('无权修改该订单');
    }
  }

  /**
   * 断言用户是否有权进行权益调整（冻结/解冻/延期）
   */
  assertCanAdjustBenefit(order: Order, auth?: AuthContext | null): void {
    if (!auth) return;
    const ability = this.abilityFactory.createForUser(auth);
    if (!ability.can('adjustBenefit', subject('Order', order))) {
      throw new ForbiddenException('无权调整该订单权益');
    }
  }

  /**
   * 断言用户是否有权删除该订单
   */
  assertCanDelete(order: Order, auth?: AuthContext | null): void {
    if (!auth) return;
    const ability = this.abilityFactory.createForUser(auth);
    if (!ability.can('delete', subject('Order', order))) {
      throw new ForbiddenException('无权删除该订单');
    }
  }
}
