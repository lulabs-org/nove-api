import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UserInfoTool {
  constructor(private readonly prisma: PrismaService) {}

  @Tool({
    name: 'get-user-info',
    description: 'Get user information by user ID',
    parameters: z.object({
      userId: z.string().describe('The ID of the user to fetch'),
    }),
  })
  async getUserInfo({ userId }: { userId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return {
        userId,
        status: 'error',
        message: `User not found with ID: ${userId}`,
        data: null,
      };
    }

    return {
      userId: user.id,
      status: 'success',
      message: 'User info retrieved successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        countryCode: user.countryCode,
        phone: user.phone,
        emailVerified: !!user.emailVerifiedAt,
        phoneVerified: !!user.phoneVerifiedAt,
        active: user.active,
        lastLoginAt: user.lastLoginAt?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        profile: user.profile
          ? {
              name: user.profile.name,
              avatar: user.profile.avatar,
              bio: user.profile.bio,
              firstName: user.profile.firstName,
              lastName: user.profile.lastName,
              dateOfBirth: user.profile.dateOfBirth?.toISOString(),
              gender: user.profile.gender,
              city: user.profile.city,
              country: user.profile.country,
            }
          : null,
      },
    };
  }

  @Tool({
    name: 'find-user-by-username',
    description: 'Find user by username',
    parameters: z.object({
      username: z.string().describe('The username to search for'),
    }),
  })
  async findUserByUsername({ username }: { username: string }) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { profile: true },
    });

    if (!user) {
      return {
        status: 'error',
        message: `User not found with username: ${username}`,
        data: null,
      };
    }

    return {
      userId: user.id,
      status: 'success',
      message: 'User found successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        countryCode: user.countryCode,
        phone: user.phone,
        emailVerified: !!user.emailVerifiedAt,
        phoneVerified: !!user.phoneVerifiedAt,
        active: user.active,
        lastLoginAt: user.lastLoginAt?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        profile: user.profile
          ? {
              name: user.profile.name,
              avatar: user.profile.avatar,
              bio: user.profile.bio,
              firstName: user.profile.firstName,
              lastName: user.profile.lastName,
              dateOfBirth: user.profile.dateOfBirth?.toISOString(),
              gender: user.profile.gender,
              city: user.profile.city,
              country: user.profile.country,
            }
          : null,
      },
    };
  }

  @Tool({
    name: 'find-user-by-phone',
    description: 'Find user by phone number',
    parameters: z.object({
      countryCode: z.string().describe('Country code (e.g., +86)'),
      phone: z.string().describe('Phone number'),
    }),
  })
  async findUserByPhone({
    countryCode,
    phone,
  }: {
    countryCode: string;
    phone: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { unique_phone_combination: { countryCode, phone } },
      include: { profile: true },
    });

    if (!user) {
      return {
        status: 'error',
        message: `User not found with phone: ${countryCode}${phone}`,
        data: null,
      };
    }

    return {
      userId: user.id,
      status: 'success',
      message: 'User found successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        countryCode: user.countryCode,
        phone: user.phone,
        emailVerified: !!user.emailVerifiedAt,
        phoneVerified: !!user.phoneVerifiedAt,
        active: user.active,
        lastLoginAt: user.lastLoginAt?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        profile: user.profile
          ? {
              name: user.profile.name,
              avatar: user.profile.avatar,
              bio: user.profile.bio,
              firstName: user.profile.firstName,
              lastName: user.profile.lastName,
              dateOfBirth: user.profile.dateOfBirth?.toISOString(),
              gender: user.profile.gender,
              city: user.profile.city,
              country: user.profile.country,
            }
          : null,
      },
    };
  }
}
