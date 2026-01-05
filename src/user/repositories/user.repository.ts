import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { User, UserProfile } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // User queries
  getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  getUserByIdWithProfile(
    id: string,
  ): Promise<(User & { profile: UserProfile | null }) | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  findUserByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserByPhoneCombination(
    countryCode: string,
    phone: string,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        uq_users_country_code_phone: {
          countryCode,
          phone,
        },
      },
    });
  }

  findUserByTarget(
    target: string,
    countryCode?: string,
  ): Promise<(User & { profile: UserProfile | null }) | null> {
    const conditions: Array<Record<string, unknown>> = [
      { username: target },
      { email: target },
    ];
    if (countryCode) {
      conditions.push({
        unique_phone_combination: { countryCode, phone: target },
      });
    } else {
      conditions.push({ phone: target });
    }

    return this.prisma.user.findFirst({
      where: { OR: conditions },
      include: { profile: true },
    });
  }

  findFirstByConditions(conditions: Array<Record<string, unknown>>) {
    return this.prisma.user.findFirst({ where: { OR: conditions } });
  }

  createUserWithProfile(data: {
    username?: string | null;
    email?: string | null;
    phone?: string | null;
    countryCode?: string | null;
    password: string | null;
    emailVerifiedAt?: Date | null;
    phoneVerifiedAt?: Date | null;
    profileName: string;
  }): Promise<User & { profile: UserProfile | null }> {
    return this.prisma.user.create({
      data: {
        username: data.username ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        countryCode: data.countryCode ?? null,
        passwordHash: data.password,
        emailVerifiedAt: data.emailVerifiedAt ?? null,
        phoneVerifiedAt: data.phoneVerifiedAt ?? null,
        profile: {
          create: {
            displayName: data.profileName,
          },
        },
      },
      include: { profile: true },
    });
  }

  updateUserLastLoginAt(id: string, date: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: date },
    });
  }

  updateUserPassword(id: string, password: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash: password },
    });
  }

  updateUserWithProfileUpsert(
    id: string,
    data: {
      username?: string;
      email?: string;
      phone?: string;
      countryCode?: string;
      profile?: { displayName?: string; avatar?: string; bio?: string };
    },
  ): Promise<User & { profile: UserProfile | null }> {
    const { profile, ...userData } = data;
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(userData.username ? { username: userData.username } : {}),
        ...(userData.email !== undefined ? { email: userData.email } : {}),
        ...(userData.phone !== undefined ? { phone: userData.phone } : {}),
        ...(userData.countryCode !== undefined
          ? { countryCode: userData.countryCode }
          : {}),
        ...(profile
          ? {
              profile: {
                upsert: {
                  create: {
                    displayName: profile.displayName,
                    avatar: profile.avatar,
                    bio: profile.bio,
                  },
                  update: {
                    displayName: profile.displayName,
                    avatar: profile.avatar,
                    bio: profile.bio,
                  },
                },
              },
            }
          : {}),
      },
      include: { profile: true },
    });
  }
}
