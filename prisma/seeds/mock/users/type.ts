import { Gender, User } from '@prisma/client';

export interface UserProfileConfig {
  displayName: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  bio: string;
  city?: string;
  country?: string;
  dateOfBirth?: Date;
}

export interface CreatedUsers {
  adminUser: User;
  financeUser: User;
  customerServiceUser: User;
  normalUsers: User[];
}
