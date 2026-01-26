/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-25 20:46:36
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-25 20:46:38
 * @FilePath: /nove_api/src/common/decorators/is-future-date.decorator.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string): boolean {
    if (!dateString) {
      return false;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return false;
    }

    return date.getTime() > Date.now();
  }

  defaultMessage(): string {
    return '执行时间必须是未来的时间';
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}
