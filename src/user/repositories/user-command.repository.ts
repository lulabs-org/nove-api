import { Injectable } from '@nestjs/common';
import { generateUsername } from '@/common/utils';
import { PrismaService } from '@/prisma/prisma.service';
import type { User, UserProfile } from '@prisma/client';

@Injectable()
export class UserCommandRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithProfile(data: {
    username?: string | null;
    email?: string | null;
    phone?: string | null;
    countryCode?: string | null;
    password: string | null;
    emailVerifiedAt?: Date | null;
    phoneVerifiedAt?: Date | null;
    profileName: string;
  }): Promise<
    User & {
      profile: UserProfile | null;
      orgMembers: Array<{
        memberRoles: Array<{
          role: { code: string };
        }>;
      }>;
    }
  > {
    return this.prisma.user.create({
      data: {
        username: data.username ?? generateUsername(),
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
      include: {
        profile: true,
        orgMembers: {
          include: {
            memberRoles: {
              include: {
                role: {
                  select: {
                    code: true,
                  },
                },
              },
              orderBy: {
                role: {
                  level: 'asc',
                },
              },
              take: 1,
            },
          },
        },
      },
    }) as Promise<
      User & {
        profile: UserProfile | null;
        orgMembers: Array<{
          memberRoles: Array<{
            role: { code: string };
          }>;
        }>;
      }
    >;
  }

  updateLastLogin(id: string, date: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: date },
    });
  }

  updatePassword(id: string, password: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash: password },
    });
  }

  updateProfile(
    id: string,
    data: {
      username?: string;
      email?: string;
      phone?: string;
      countryCode?: string;
      profile?: Partial<{
        displayName: string;
        avatar: string;
        bio: string;
      }>;
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
