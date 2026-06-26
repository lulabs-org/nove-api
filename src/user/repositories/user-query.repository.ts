import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { User, UserProfile } from '@prisma/client';

@Injectable()
export class UserQueryRepository {
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
}
