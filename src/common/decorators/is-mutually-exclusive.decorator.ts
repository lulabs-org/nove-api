import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidateIf,
  IsDefined,
} from 'class-validator';

@ValidatorConstraint({ name: 'isMutuallyExclusive', async: false })
export class IsMutuallyExclusiveConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as Record<string, any>)[
      relatedPropertyName
    ];

    // 如果当前字段有值，则关联字段必须为空 (null 或 undefined)
    if (value != null) {
      return relatedValue == null;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} 和 ${relatedPropertyName} 不能同时填写`;
  }
}

/**
 * 复合装饰器：校验互斥字段
 * 1. 至少填写一个（如果关联字段为空，当前字段必须填写）
 * 2. 只能填写一个（如果当前字段填写了，关联字段不能填写）
 * @param relatedProperty 关联字段名
 * @param validationOptions 校验选项
 */
export function IsMutuallyExclusive(
  relatedProperty: string,
  validationOptions?: ValidationOptions,
) {
  return function (target: object, propertyName: string) {
    // 技巧：为了避免两个字段互相校验产生两条重复的错误信息，
    // 我们约定只在字典序较小的一侧注册校验规则。
    // 因为互斥校验是双向的，一侧拦截就足够了。
    if (propertyName > relatedProperty) {
      // 较大的一侧我们只挂载一个 IsOptional，确保 ValidateNested 等不会在 undefined 时误报
      const { IsOptional } = require('class-validator');
      IsOptional()(target, propertyName);
      return;
    }

    // 1. 核心逻辑：如果当前字段有值，或者关联字段没值，才进入后续校验。
    ValidateIf(
      (o: any) => o[propertyName] != null || o[relatedProperty] == null,
    )(target, propertyName);

    // 2. 保证非空（配合上面的 ValidateIf 实现了“至少填一个”的限制）
    IsDefined({
      message:
        validationOptions?.message ||
        `${propertyName} 和 ${relatedProperty} 必须填写其中一个`,
    })(target, propertyName);

    // 3. 自定义互斥校验（实现了“不能同时填写两个”的限制）
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      constraints: [relatedProperty],
      options: validationOptions,
      validator: IsMutuallyExclusiveConstraint,
    });
  };
}
