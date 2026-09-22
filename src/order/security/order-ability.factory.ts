import { AbilityBuilder, PureAbility } from '@casl/ability';
import { createPrismaAbility, PrismaQuery, Subjects } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import { Order, OrderStatus } from '@/generated/prisma/client';
import { AuthContext } from '@/auth/types/auth-context.interface';

export type OrderSubject =
  | Subjects<{
      Order: Order;
    }>
  | 'Order'
  | 'all';

export type OrderAbility = PureAbility<[string, OrderSubject], PrismaQuery>;

@Injectable()
export class OrderAbilityFactory {
  createForUser(auth?: AuthContext | null): OrderAbility {
    const { can, cannot, build } = new AbilityBuilder<OrderAbility>(createPrismaAbility);

    if (!auth || !auth.userId) {
      return build();
    }

    const userId = auth.userId;
    const permissions = auth.permissions || [];
    const roles = auth.user?.roles || [];

    const isSuperOrAdmin =
      permissions.includes('*') ||
      permissions.includes('order:admin') ||
      permissions.includes('admin') ||
      roles.includes('SUPER_ADMIN') ||
      roles.includes('ADMIN');

    if (isSuperOrAdmin) {
      can('manage', 'Order');
      return build();
    }

    // 1. 读取权限 (read)
    if (permissions.includes('order:read') || permissions.includes('order:*')) {
      can('read', 'Order', {
        currentOwnerId: userId,
      });
      can('read', 'Order', {
        currentOwnerId: null,
      });
      can('read', 'Order', {
        purchaserId: userId,
      });
    }

    // 2. 创建权限 (create)
    if (permissions.includes('order:create') || permissions.includes('order:*')) {
      can('create', 'Order');
    }

    // 3. 更新权限 (update)
    if (permissions.includes('order:update') || permissions.includes('order:*')) {
      can('update', 'Order', {
        currentOwnerId: userId,
      });

      // 状态限制：已取消和已完成的订单，普通人员禁止直接修改
      cannot('update', 'Order', {
        status: { in: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] },
      });
    }

    // 4. 权益调整权限 (adjustBenefit)
    if (permissions.includes('order:update') || permissions.includes('order:*')) {
      can('adjustBenefit', 'Order', {
        currentOwnerId: userId,
        status: { in: [OrderStatus.PAID, OrderStatus.FROZEN] },
      });
    }

    // 5. 删除权限 (delete)
    if (permissions.includes('order:delete') || permissions.includes('order:*')) {
      can('delete', 'Order');
    }

    return build();
  }
}
