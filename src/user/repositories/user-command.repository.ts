import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, User, UserProfile } from '@prisma/client';

@Injectable()
export class UserCommandRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithProfile(data: {
    username?: string | null;
    email?: string | null;
    phone?: string | null;
    countryCode?: string | null;
    password?: string | null;
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
        username: data.username ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        countryCode: data.countryCode ?? null,
        passwordHash: data.password ?? null,
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

  /**
   * 接受邀请时标记用户邮箱已验证。
   * 注意：调用方需在事务中执行以保证与成员状态变更的原子性，
   * 因此本方法保留为直接 prisma 调用，不自带事务包裹。
   */
  markEmailVerified(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });
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
