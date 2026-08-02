import { Injectable } from '@nestjs/common';
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
    password?: string | null;
    emailVerifiedAt?: Date | null;
    phoneVerifiedAt?: Date | null;
    profileName: string;
    invitationToken?: string | null;
    invitationExpiresAt?: Date | null;
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
        invitationToken: data.invitationToken ?? null,
        invitationExpiresAt: data.invitationExpiresAt ?? null,
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
   * 接受组织邀请：标记邮箱已验证、清除邀请 token、记录接受时间。
   */
  acceptInvitation(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        invitationAcceptedAt: new Date(),
        invitationToken: null,
        invitationExpiresAt: null,
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
