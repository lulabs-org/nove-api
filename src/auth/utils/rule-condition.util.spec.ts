/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-22 14:31:00
 * @Description: 数据权限规则条件解析器单测
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { resolveRuleCondition } from './rule-condition.util';
import { AuthContext } from '@/auth/types/auth-context.interface';

describe('resolveRuleCondition', () => {
  const mockAuth: AuthContext = {
    authMethod: 'jwt',
    userId: 'usr_100',
    orgId: 'org_corp_1',
    primaryDeptId: 'dept_sales',
    departmentIds: ['dept_sales', 'dept_east'],
    permissions: ['order:read'],
    user: {
      id: 'usr_100',
      email: 'test@example.com',
      roles: ['SALES_REP'],
    } as any,
  };

  it('returns empty object when condition string is empty or whitespace', () => {
    expect(resolveRuleCondition('', mockAuth)).toEqual({});
    expect(resolveRuleCondition('   ', mockAuth)).toEqual({});
  });

  it('returns null when condition string is not valid JSON', () => {
    expect(resolveRuleCondition('{ invalid json }', mockAuth)).toBeNull();
  });

  it('returns null when parsed JSON is not a plain object (e.g. array, number, string)', () => {
    expect(resolveRuleCondition('["a", "b"]', mockAuth)).toBeNull();
    expect(resolveRuleCondition('"a string"', mockAuth)).toBeNull();
    expect(resolveRuleCondition('123', mockAuth)).toBeNull();
    expect(resolveRuleCondition('null', mockAuth)).toBeNull();
  });

  it('substitutes single string variables correctly', () => {
    const raw = JSON.stringify({
      currentOwnerId: '${user.id}',
      departmentId: '${user.departmentId}',
      companyId: '${user.companyId}',
    });

    const result = resolveRuleCondition(raw, mockAuth);
    expect(result).toEqual({
      currentOwnerId: 'usr_100',
      departmentId: 'dept_sales',
      companyId: 'org_corp_1',
    });
  });

  it('substitutes array variables correctly', () => {
    const raw = JSON.stringify({
      departmentId: { $in: '${user.departmentIds}' },
      role: { $in: '${user.roles}' },
    });

    const result = resolveRuleCondition(raw, mockAuth);
    expect(result).toEqual({
      departmentId: { in: ['dept_sales', 'dept_east'] },
      role: { in: ['SALES_REP'] },
    });
  });

  it('normalizes MongoDB-style operators ($or, $and, $in, $gte, etc.)', () => {
    const raw = JSON.stringify({
      $or: [
        { currentOwnerId: '${user.id}' },
        { departmentId: { $in: '${user.departmentIds}' } },
      ],
      amount: { $gte: 100, $lte: 500 },
    });

    const result = resolveRuleCondition(raw, mockAuth);
    expect(result).toEqual({
      OR: [
        { currentOwnerId: 'usr_100' },
        { departmentId: { in: ['dept_sales', 'dept_east'] } },
      ],
      amount: { gte: 100, lte: 500 },
    });
  });

  it('handles nested objects and leaves non-matching string values untouched', () => {
    const raw = JSON.stringify({
      nested: {
        field: 'normal_literal_value',
        owner: '${user.id}',
      },
      status: 'ACTIVE',
    });

    const result = resolveRuleCondition(raw, mockAuth);
    expect(result).toEqual({
      nested: {
        field: 'normal_literal_value',
        owner: 'usr_100',
      },
      status: 'ACTIVE',
    });
  });

  it('safely handles missing auth values by falling back to empty strings or arrays', () => {
    const emptyAuth: AuthContext = {
      authMethod: 'jwt',
      userId: null,
      orgId: null,
      permissions: [],
    };

    const raw = JSON.stringify({
      ownerId: '${user.id}',
      deptId: '${user.departmentId}',
      deptIds: '${user.departmentIds}',
    });

    const result = resolveRuleCondition(raw, emptyAuth);
    expect(result).toEqual({
      ownerId: '',
      deptId: '',
      deptIds: [],
    });
  });
});
