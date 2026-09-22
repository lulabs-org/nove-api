import { validateDataRuleCondition } from './data-rule-condition.util';

describe('validateDataRuleCondition', () => {
  it('accepts explicit full access and nested order conditions', () => {
    expect(validateDataRuleCondition('{}', 'order')).toBeNull();
    expect(
      validateDataRuleCondition(
        JSON.stringify({
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
        'order',
      ),
    ).toBeNull();
  });

  it.each([
    ['{"$or":[]}', '至少需要'],
    ['{"$and":[{}]}', '不能为空'],
    ['{"status":{"$regex":"PAID"}}', '操作符'],
    ['{"departmentId":"dept-1"}', '不存在'],
    ['{"amount":{"$in":[]}}', '非空数组'],
    ['{"$or":[{"status":"PAID"}],"OR":[{"status":"UNPAID"}]}', '重复'],
    ['{"status":{"$ne":"PAID","not":"UNPAID"}}', '重复'],
    ['[]', 'JSON 对象'],
  ])('rejects invalid order condition %s', (condition, message) => {
    expect(validateDataRuleCondition(condition, 'order')).toContain(message);
  });

  it('rejects excessive nesting', () => {
    const nested = {
      $and: [
        {
          $or: [{ $and: [{ $or: [{ $and: [{ currentOwnerId: 'usr-1' }] }] }] }],
        },
      ],
    };
    expect(
      validateDataRuleCondition(JSON.stringify(nested), 'order'),
    ).toContain('最多嵌套');
  });
});
