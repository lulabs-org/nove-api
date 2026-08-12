import { Injectable } from '@nestjs/common';
import { Gender, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export const adminUserSelect = {
  id: true,
  username: true,
  email: true,
  countryCode: true,
  phone: true,
  active: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  profile: {
    select: {
      displayName: true,
      avatar: true,
      bio: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      address: true,
      city: true,
      country: true,
      zipCode: true,
      website: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AdminUserRecord = Prisma.UserGetPayload<{
  select: typeof adminUserSelect;
}>;

export interface AdminUserWriteData {
  username?: string | null;
  email?: string | null;
  countryCode?: string | null;
  phone?: string | null;
  active?: boolean;
  displayName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: Date | null;
  gender?: Gender | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  zipCode?: string | null;
  website?: string | null;
}

@Injectable()
export class AdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(args: {
    where: Prisma.UserWhereInput;
    skip: number;
    take: number;
    orderBy: Prisma.UserOrderByWithRelationInput;
  }): Promise<{ items: AdminUserRecord[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ ...args, select: adminUserSelect }),
      this.prisma.user.count({ where: args.where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<AdminUserRecord | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: adminUserSelect,
    });
  }

  findConflict(
    values: Pick<
      AdminUserWriteData,
      'username' | 'email' | 'countryCode' | 'phone'
    >,
    excludeId?: string,
  ) {
    const or: Prisma.UserWhereInput[] = [];
    if (values.username) or.push({ username: values.username });
    if (values.email) or.push({ email: values.email });
    if (values.countryCode && values.phone) {
      or.push({ countryCode: values.countryCode, phone: values.phone });
    }
    if (!or.length) return Promise.resolve(null);
    return this.prisma.user.findFirst({
      where: { OR: or, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: {
        id: true,
        username: true,
        email: true,
        countryCode: true,
        phone: true,
      },
    });
  }

  create(data: AdminUserWriteData): Promise<AdminUserRecord> {
    const {
      displayName,
      avatar,
      bio,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      address,
      city,
      country,
      zipCode,
      website,
      ...userData
    } = data;
    const profileData = {
      displayName,
      avatar,
      bio,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      address,
      city,
      country,
      zipCode,
      website,
    };
    const hasProfileData = Object.values(profileData).some(
      (value) => value !== undefined && value !== null,
    );
    return this.prisma.user.create({
      data: {
        ...userData,
        ...(hasProfileData ? { profile: { create: profileData } } : {}),
      },
      select: adminUserSelect,
    });
  }

  update(id: string, data: AdminUserWriteData): Promise<AdminUserRecord> {
    const {
      displayName,
      avatar,
      bio,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      address,
      city,
      country,
      zipCode,
      website,
      ...userData
    } = data;
    const profileData = {
      displayName,
      avatar,
      bio,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      address,
      city,
      country,
      zipCode,
      website,
    };
    const hasProfileUpdate = Object.values(profileData).some(
      (value) => value !== undefined,
    );
    return this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        ...(hasProfileUpdate
          ? {
              profile: {
                upsert: {
                  create: profileData,
                  update: profileData,
                },
              },
            }
          : {}),
      },
      select: adminUserSelect,
    });
  }

  softDelete(id: string): Promise<AdminUserRecord> {
    return this.prisma.user.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
      select: adminUserSelect,
    });
  }
}
