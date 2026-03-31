import { NotFoundException, BadRequestException } from '@nestjs/common';

export class OrgMemberNotFoundException extends NotFoundException {
  constructor(message: string = 'Member not found') {
    super(message);
  }
}

export class MemberAlreadyExistsException extends BadRequestException {
  constructor(
    message: string = 'User is already a member of this organization',
  ) {
    super(message);
  }
}

export class EmployeeNumberExistsException extends BadRequestException {
  constructor(message: string = 'Employee number already exists') {
    super(message);
  }
}

export class InvalidDepartmentException extends BadRequestException {
  constructor(message: string = 'Invalid department') {
    super(message);
  }
}

export class InvalidMemberStatusException extends BadRequestException {
  constructor(message: string = 'Invalid member status') {
    super(message);
  }
}
