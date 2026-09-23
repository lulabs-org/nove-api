import { Ability, AbilityBuilder } from '@casl/ability';
import { createPrismaAbility, PrismaQueryFactory } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import { Order, OrderStatus, Prisma } from '@/generated/prisma/client';
import { AuthContext } from '@/auth/types/auth-context.interface';
import { resolveRuleCondition } from '@/auth/utils/rule-condition.util';
import { isSuperOrAdmin } from '@/auth/utils/auth-context.helper';
import { validateDataRuleCondition } from '@/admin/permission/utils/data-rule-condition.util';

export type OrderSubject = Order | 'Order' | 'all';

type AppPrismaQuery = PrismaQueryFactory<Prisma.TypeMap>;

export type OrderAbility = Ability<[string, OrderSubject], AppPrismaQuery>;

@Injectable()
export class OrderAbilityFactory {
  createForUser(auth?: AuthContext | null): OrderAbility {
    const { can, cannot, build } = new AbilityBuilder<OrderAbility>(
      createPrismaAbility,
    );

    if (!auth || !auth.userId) {
      return build();
    }

    if (isSuperOrAdmin(auth, 'order:admin')) {
      can('manage', 'Order');
      return build();
    }

    const userId = auth.userId;
    const permissions = auth.permissions || [];
    const dataRules = auth.dataRules || [];

    const getRulesForAction = (targetAction: string) => {
      return dataRules.filter(
        (r) =>
          r.resource &&
          r.resource.trim().toLowerCase() === 'order' &&
          (!r.action ||
            r.action === '*' ||
            r.action.trim().toLowerCase() === targetAction.toLowerCase()),
      );
    };

    // 1. 读取权限 (read)
    if (permissions.includes('order:read') || permissions.includes('order:*')) {
      const orderReadRules = getRulesForAction('read');

      if (orderReadRules.length > 0) {
        // 用户角色显式配置了数据规则：按配置的规则赋权
        for (const rule of orderReadRules) {
          if (validateDataRuleCondition(rule.condition, 'order')) continue;
          const condition = resolveRuleCondition<Prisma.OrderWhereInput>(
            rule.condition,
            auth,
          );
          if (condition && Object.keys(condition).length > 0) {
            can('read', 'Order', condition);
          } else if (condition && Object.keys(condition).length === 0) {
            // 空条件即全量开放
            can('read', 'Order');
          }
        }
      }
    }

    // 2. 创建权限 (create)
    if (
      permissions.includes('order:create') ||
      permissions.includes('order:*')
    ) {
      can('create', 'Order');
    }

    // 3. 更新权限 (update)
    if (
      permissions.includes('order:update') ||
      permissions.includes('order:*')
    ) {
      const orderUpdateRules = getRulesForAction('update');

      if (orderUpdateRules.length > 0) {
        for (const rule of orderUpdateRules) {
          if (validateDataRuleCondition(rule.condition, 'order')) continue;
          const condition = resolveRuleCondition<Prisma.OrderWhereInput>(
            rule.condition,
            auth,
          );
          if (condition && Object.keys(condition).length > 0) {
            can('update', 'Order', condition);
          } else if (condition && Object.keys(condition).length === 0) {
            can('update', 'Order');
          }
        }
      } else {
        // 未显式配置更新数据规则时，安全降级回落到默认行为：仅允许修改当前由本人负责的订单
        can('update', 'Order', {
          currentOwnerId: userId,
        });
      }

      // 状态限制：已取消和已完成的订单，普通人员禁止直接修改
      cannot('update', 'Order', {
        status: { in: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] },
      });
    }

    // 4. 权益调整权限 (adjustBenefit)
    if (
      permissions.includes('order:update') ||
      permissions.includes('order:*')
    ) {
      can('adjustBenefit', 'Order', {
        currentOwnerId: userId,
        status: { in: [OrderStatus.PAID, OrderStatus.FROZEN] },
      });
    }

    // 5. 删除权限 (delete)
    if (
      permissions.includes('order:delete') ||
      permissions.includes('order:*')
    ) {
      const orderDeleteRules = getRulesForAction('delete');

      if (orderDeleteRules.length > 0) {
        for (const rule of orderDeleteRules) {
          if (validateDataRuleCondition(rule.condition, 'order')) continue;
          const condition = resolveRuleCondition<Prisma.OrderWhereInput>(
            rule.condition,
            auth,
          );
          if (condition && Object.keys(condition).length > 0) {
            can('delete', 'Order', condition);
          } else if (condition && Object.keys(condition).length === 0) {
            can('delete', 'Order');
          }
        }
      } else {
        can('delete', 'Order');
      }
    }

    return build();
  }
}
