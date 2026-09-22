import { Prisma } from '@/generated/prisma/client';

export const MAX_DATA_RULE_DEPTH = 5;
export const MAX_DATA_RULE_NODES = 100;

const filterOperators = new Set([
  'eq',
  'ne',
  'in',
  'nin',
  'gt',
  'gte',
  'lt',
  'lte',
  'equals',
  'not',
  'notIn',
]);
const orderFields = new Set<string>(Object.values(Prisma.OrderScalarFieldEnum));
const unsupportedOrderJsonFields = new Set(['metadata', 'settleInfo']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Returns a validation error, or null for a safe, supported condition shape. */
export function validateDataRuleCondition(
  condition: string,
  resource?: string,
): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(condition) as unknown;
  } catch {
    return '请输入有效的 JSON 条件';
  }
  if (!isRecord(parsed)) return '规则条件必须是 JSON 对象';

  let nodes = 0;
  const check = (
    object: Record<string, unknown>,
    depth: number,
    root: boolean,
  ): string | null => {
    if (depth > MAX_DATA_RULE_DEPTH) {
      return `条件组最多嵌套 ${MAX_DATA_RULE_DEPTH} 层`;
    }
    if (!root && Object.keys(object).length === 0) return '子条件不能为空';
    const seenLogicalKeys = new Set<string>();

    for (const [key, value] of Object.entries(object)) {
      if (++nodes > MAX_DATA_RULE_NODES) {
        return `条件最多包含 ${MAX_DATA_RULE_NODES} 个节点`;
      }
      if (key === '$and' || key === 'AND' || key === '$or' || key === 'OR') {
        const canonical = key.toLowerCase().includes('or') ? 'OR' : 'AND';
        if (seenLogicalKeys.has(canonical)) {
          return `重复的 ${canonical} 条件组`;
        }
        seenLogicalKeys.add(canonical);
        if (!Array.isArray(value) || value.length === 0) {
          return 'AND / OR 条件组至少需要一个条件';
        }
        for (const child of value as unknown[]) {
          if (!isRecord(child)) return '条件组内必须是 JSON 对象';
          const error = check(child, depth + 1, false);
          if (error) return error;
        }
        continue;
      }
      if (
        !key.trim() ||
        key.startsWith('$') ||
        ['__proto__', 'constructor', 'prototype'].includes(key)
      ) {
        return `不支持的条件字段：${key}`;
      }
      if (
        resource?.toLowerCase() === 'order' &&
        (!orderFields.has(key) || unsupportedOrderJsonFields.has(key))
      ) {
        return `订单不存在可过滤字段：${key}`;
      }
      if (Array.isArray(value)) {
        return `字段 ${key} 不能直接使用数组，请使用 $in`;
      }
      if (!isRecord(value)) continue;
      const operators = Object.entries(value);
      if (operators.length === 0) return `字段 ${key} 的操作符不能为空`;
      const seenOperators = new Set<string>();
      for (const [operator, operand] of operators) {
        const normalized = operator.startsWith('$')
          ? operator.slice(1)
          : operator;
        if (!filterOperators.has(normalized)) {
          return `不支持的操作符：${operator}`;
        }
        const canonical =
          normalized === 'eq'
            ? 'equals'
            : normalized === 'ne'
              ? 'not'
              : normalized === 'nin'
                ? 'notIn'
                : normalized;
        if (seenOperators.has(canonical)) {
          return `字段 ${key} 存在重复操作符：${operator}`;
        }
        seenOperators.add(canonical);
        if (
          normalized === 'in' ||
          normalized === 'nin' ||
          normalized === 'notIn'
        ) {
          const arrayVariable =
            operand === '${user.departmentIds}' || operand === '${user.roles}';
          if (
            (!Array.isArray(operand) || operand.length === 0) &&
            !arrayVariable
          ) {
            return `${operator} 需要非空数组或数组变量`;
          }
        } else if (Array.isArray(operand) || isRecord(operand)) {
          return `${operator} 需要单个值`;
        }
      }
    }
    return null;
  };

  return check(parsed, 1, true);
}
