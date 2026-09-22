import { Ability, AbilityBuilder } from '@casl/ability';
import { createPrismaAbility, PrismaQueryFactory } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import { Order, OrderStatus, Prisma } from '@/generated/prisma/client';
import { AuthContext } from '@/auth/types/auth-context.interface';

export type OrderSubject = Order | 'Order' | 'all';

type AppPrismaQuery = PrismaQueryFactory<Prisma.TypeMap>;

export type OrderAbility = Ability<[string, OrderSubject], AppPrismaQuery>;

/**
 * 将规则条件中的动态变量（如 ${user.id}、${user.departmentId}）替换为真实认证上下文值，
 * 并对操作符进行归一化处理。
 */
export function resolveRuleCondition(
  conditionStr: string,
  auth: AuthContext,
): Prisma.OrderWhereInput | null {
  if (!conditionStr || !conditionStr.trim()) {
    return {};
  }

  const contextMap: Record<string, unknown> = {
    '${user.id}': auth.userId || '',
    '${user.departmentId}': auth.primaryDeptId || '',
    '${user.departmentIds}': auth.departmentIds || [],
    '${user.roles}': auth.user?.roles || [],
    '${user.companyId}': auth.orgId || '',
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(conditionStr) as unknown;
  } catch {
    return null;
  }

  const substitute = (val: unknown): unknown => {
    if (val === null || val === undefined) return val;
    if (typeof val === 'string') {
      if (contextMap[val] !== undefined) {
        return contextMap[val];
      }
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(substitute);
    }
    if (typeof val === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(val)) {
        // 归一化操作符: $or -> OR, $and -> AND, $in -> in, $gte -> gte 等
        let normKey = key;
        if (key === '$or') normKey = 'OR';
        else if (key === '$and') normKey = 'AND';
        else if (key.startsWith('$')) normKey = key.slice(1);

        result[normKey] = substitute(value);
      }
      return result;
    }
    return val;
  };

  const resolved = substitute(parsed);
  if (
    typeof resolved !== 'object' ||
    resolved === null ||
    Array.isArray(resolved)
  ) {
    return null;
  }

  return resolved as Prisma.OrderWhereInput;
}

@Injectable()
export class OrderAbilityFactory {
  createForUser(auth?: AuthContext | null): OrderAbility {
    const { can, cannot, build } = new AbilityBuilder<OrderAbility>(
      createPrismaAbility,
    );

    if (!auth || !auth.userId) {
      return build();
    }

    const userId = auth.userId;
    const permissions = auth.permissions || [];
    const roles = auth.user?.roles || [];
    const dataRules = auth.dataRules || [];

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
      const orderDataRules = dataRules.filter(
        (r) => r.resource && r.resource.trim().toLowerCase() === 'order',
      );

      if (orderDataRules.length > 0) {
        // 用户角色显式配置了数据规则：按配置的规则赋权
        for (const rule of orderDataRules) {
          const condition = resolveRuleCondition(rule.condition, auth);
          if (condition && Object.keys(condition).length > 0) {
            can('read', 'Order', condition);
          } else if (condition && Object.keys(condition).length === 0) {
            // 空条件即全量开放
            can('read', 'Order');
          }
        }
      } else {
        // 未配置显式数据规则：默认安全策略（本人负责、本人购买或公海未认领）
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
      can('update', 'Order', {
        currentOwnerId: userId,
      });

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
      can('delete', 'Order');
    }

    return build();
  }
}
