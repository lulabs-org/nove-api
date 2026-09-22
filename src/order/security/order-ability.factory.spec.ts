import { accessibleBy } from '@casl/prisma';
import {
  OrderAbilityFactory,
  resolveRuleCondition,
} from './order-ability.factory';
import { AuthContext } from '@/auth/types/auth-context.interface';

describe('OrderAbilityFactory with Dynamic Data Rules', () => {
  let factory: OrderAbilityFactory;

  beforeEach(() => {
    factory = new OrderAbilityFactory();
  });

  describe('resolveRuleCondition', () => {
    it('replaces ${user.id} and ${user.departmentId} correctly', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_alice_1',
        orgId: 'org_1',
        primaryDeptId: 'dept_sales',
        departmentIds: ['dept_sales', 'dept_sub'],
        permissions: ['order:read'],
      };

      const resolved = resolveRuleCondition(
        JSON.stringify({
          currentOwnerId: '${user.id}',
          departmentId: '${user.departmentId}',
        }),
        auth,
      );

      expect(resolved).toEqual({
        currentOwnerId: 'usr_alice_1',
        departmentId: 'dept_sales',
      });
    });

    it('normalizes $in to in and substitutes array variables', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_alice_1',
        orgId: 'org_1',
        primaryDeptId: 'dept_sales',
        departmentIds: ['dept_sales', 'dept_sub'],
        permissions: ['order:read'],
      };

      const resolved = resolveRuleCondition(
        JSON.stringify({
          departmentId: { $in: '${user.departmentIds}' },
        }),
        auth,
      );

      expect(resolved).toEqual({
        departmentId: { in: ['dept_sales', 'dept_sub'] },
      });
    });
  });

  describe('createForUser with dynamic rules', () => {
    it('applies a configured status list in accessibleBy Prisma query', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_sales_lead',
        orgId: 'org_1',
        primaryDeptId: 'dept_east_sales',
        departmentIds: ['dept_east_sales', 'dept_east_team_a'],
        permissions: ['order:read'],
        dataRules: [
          {
            id: 'rule_dept_1',
            code: 'order_dept_only',
            resource: 'order',
            condition: JSON.stringify({ status: { $in: ['PAID', 'FROZEN'] } }),
          },
        ],
      };

      const ability = factory.createForUser(auth);
      const where = accessibleBy(ability, 'read').ofType('Order');

      expect(where).toEqual({
        OR: [
          {
            status: { in: ['PAID', 'FROZEN'] },
          },
        ],
      });
    });

    it('applies nested owner-or-purchaser AND paid rule', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_rep_1',
        orgId: 'org_1',
        permissions: ['order:read'],
        dataRules: [
          {
            id: 'rule-nested',
            code: 'order_nested',
            resource: 'order',
            condition: JSON.stringify({
              $and: [
                {
                  $or: [
                    { currentOwnerId: '${user.id}' },
                    { purchaserId: '${user.id}' },
                  ],
                },
                { status: 'PAID' },
              ],
            }),
          },
        ],
      };
      const where = accessibleBy(factory.createForUser(auth), 'read').ofType(
        'Order',
      );
      expect(where).toEqual({
        OR: [
          {
            AND: [
              {
                OR: [
                  { currentOwnerId: 'usr_rep_1' },
                  { purchaserId: 'usr_rep_1' },
                ],
              },
              { status: 'PAID' },
            ],
          },
        ],
      });
    });

    it('ignores a legacy rule with a nonexistent order field', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_rep_1',
        orgId: 'org_1',
        permissions: ['order:read'],
        dataRules: [
          {
            id: 'bad',
            code: 'bad',
            resource: 'order',
            condition: '{"departmentId":"dept_sales"}',
          },
        ],
      };
      expect(
        accessibleBy(factory.createForUser(auth), 'read').ofType('Order'),
      ).toEqual({ OR: [] });
    });

    it('applies owner-only rule if configured in dataRules', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_rep_1',
        orgId: 'org_1',
        permissions: ['order:read'],
        dataRules: [
          {
            id: 'rule_owner_1',
            code: 'order_owner_only',
            resource: 'order',
            condition: JSON.stringify({
              currentOwnerId: '${user.id}',
            }),
          },
        ],
      };

      const ability = factory.createForUser(auth);
      const where = accessibleBy(ability, 'read').ofType('Order');

      expect(where).toEqual({
        OR: [
          {
            currentOwnerId: 'usr_rep_1',
          },
        ],
      });
    });

    it('grants full access when dataRule condition is empty object {}', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_auditor',
        orgId: 'org_1',
        permissions: ['order:read'],
        dataRules: [
          {
            id: 'rule_all_1',
            code: 'order_all_access',
            resource: 'order',
            condition: '{}',
          },
        ],
      };

      const ability = factory.createForUser(auth);
      const where = accessibleBy(ability, 'read').ofType('Order');

      // Empty where means full access
      expect(where).toEqual({});
    });

    it('denies all order rows when no data rules are attached', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_regular_1',
        orgId: 'org_1',
        permissions: ['order:read'],
        dataRules: [],
      };

      const ability = factory.createForUser(auth);
      const where = accessibleBy(ability, 'read').ofType('Order');

      expect(where).toEqual({ OR: [] });
    });

    it('allows unassigned orders only through an explicit public-pool rule', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_regular_1',
        orgId: 'org_1',
        permissions: ['order:read'],
        dataRules: [
          {
            id: 'rule_public_pool_1',
            code: 'order_public_pool',
            resource: 'order',
            condition: JSON.stringify({ currentOwnerId: null }),
          },
        ],
      };

      const ability = factory.createForUser(auth);
      const where = accessibleBy(ability, 'read').ofType('Order');

      expect(where).toEqual({ OR: [{ currentOwnerId: null }] });
    });
  });
});
