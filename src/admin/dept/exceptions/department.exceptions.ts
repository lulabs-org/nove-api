/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-17 02:41:32
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-17 02:41:33
 * @FilePath: /nove_project/nove_api/src/department/exceptions/department.exceptions.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { NotFoundException, BadRequestException } from '@nestjs/common';

export class DepartmentNotFoundException extends NotFoundException {
  constructor(message: string = 'Department not found') {
    super(message);
  }
}

export class DepartmentCodeExistsException extends BadRequestException {
  constructor(message: string = 'Department code already exists') {
    super(message);
  }
}

export class DepartmentHasChildrenException extends BadRequestException {
  constructor(
    message: string = 'Cannot delete department with child departments',
  ) {
    super(message);
  }
}

export class DepartmentHasMembersException extends BadRequestException {
  constructor(message: string = 'Cannot delete department with members') {
    super(message);
  }
}

export class InvalidParentDepartmentException extends BadRequestException {
  constructor(message: string = 'Invalid parent department') {
    super(message);
  }
}
