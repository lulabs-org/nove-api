import { Gender } from '@prisma/client';

export interface UserProfileCreateInput {
  displayName?: string;
  avatar?: string;
  bio?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  city?: string;
  country?: string;
  address?: string;
  postalCode?: string;
  state?: string;
}

export interface UserConfig {
  email: string;
  phone: string;
  password: string;
  profile: UserProfileCreateInput;
}
