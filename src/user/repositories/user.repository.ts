import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { User, UserProfile } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findWithProfile(
    id: string,
  ): Promise<(User & { profile: UserProfile | null }) | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  findWithRoles(id: string): Promise<
    | (User & {
        profile: UserProfile | null;
        orgMembers: Array<{
          memberRoles: Array<{
            role: { code: string };
          }>;
        }>;
      })
    | null
  > {
    return this.prisma.user.findUnique({
      where: { id },
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
            },
          },
        },
      },
    }) as Promise<
      | (User & {
          profile: UserProfile | null;
          orgMembers: Array<{
            memberRoles: Array<{
              role: { code: string };
            }>;
          }>;
        })
      | null
    >;
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByPhone(countryCode: string, phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        uq_users_country_code_phone: {
          countryCode,
          phone,
        },
      },
    });
  }

  findByTarget(
    target: string,
    countryCode?: string,
  ): Promise<
    | (User & {
        profile: UserProfile | null;
        orgMembers: Array<{
          memberRoles: Array<{
            role: { code: string };
          }>;
        }>;
      })
    | null
  > {
    const conditions: Array<Record<string, unknown>> = [
      { username: target },
      { email: target },
    ];
    if (countryCode) {
      conditions.push({
        uq_users_country_code_phone: { countryCode, phone: target },
      });
    } else {
      conditions.push({ phone: target });
    }

    return this.prisma.user.findFirst({
      where: { OR: conditions },
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
      | (User & {
          profile: UserProfile | null;
          orgMembers: Array<{
            memberRoles: Array<{
              role: { code: string };
            }>;
          }>;
        })
      | null
    >;
  }

  findFirst(conditions: Array<Record<string, unknown>>) {
    return this.prisma.user.findFirst({ where: { OR: conditions } });
  }

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
