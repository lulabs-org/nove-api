/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-17 02:29:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-17 02:32:31
 * @FilePath: /nove_project/nove_api/src/organization/exceptions/organization.exceptions.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { NotFoundException, BadRequestException } from '@nestjs/common';

export class OrganizationNotFoundException extends NotFoundException {
  constructor(message: string = 'Organization not found') {
    super(message);
  }
}

export class OrganizationCodeExistsException extends BadRequestException {
  constructor(message: string = 'Organization code already exists') {
    super(message);
  }
}

export class OrganizationHasChildrenException extends BadRequestException {
  constructor(
    message: string = 'Cannot delete organization with child organizations',
  ) {
    super(message);
  }
}

export class OrganizationHasUsersException extends BadRequestException {
  constructor(message: string = 'Cannot delete organization with users') {
    super(message);
  }
}
