/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-22 14:30:00
 * @Description: 数据权限规则条件解析器：支持动态变量替换与操作符归一化
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { AuthContext } from '@/auth/types/auth-context.interface';

/**
 * 将规则条件中的动态变量（如 ${user.id}、${user.departmentId} 等）替换为真实认证上下文值，
 * 并对操作符进行归一化处理（如 $or -> OR, $in -> in 等）。
 *
 * @param conditionStr JSON 格式的规则条件字符串
 * @param auth 统一认证上下文
 * @returns 解析并归一化后的过滤条件对象，解析失败时返回 null
 */
export function resolveRuleCondition<T = Record<string, unknown>>(
  conditionStr: string,
  auth: AuthContext,
): T | null {
  if (!conditionStr || !conditionStr.trim()) {
    return {} as T;
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

  return resolved as T;
}
