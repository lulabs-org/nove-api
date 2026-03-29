import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformUserRepository } from '../repositories/platform-user.repository';
import type { PlatformUser, Platform } from '@prisma/client';

@Injectable()
export class PlatformUserService {
  constructor(private readonly platformUserRepo: PlatformUserRepository) {}

  async create(data: {
    platform: Platform;
    ptUnionId: string;
    ptUserId?: string;
    displayName?: string;
    countryCode?: string;
    phone?: string;
    phoneHash?: string;
    localUserId?: string;
    active?: boolean;
  }): Promise<PlatformUser> {
    return this.platformUserRepo.create(data);
  }

  async findById(id: string) {
    const platformUser = await this.platformUserRepo.findById(id);
    if (!platformUser) {
      throw new NotFoundException('Platform user not found');
    }
    return platformUser;
  }

  async findByUnionId(platform: Platform, ptUnionId: string) {
    return this.platformUserRepo.findByUnionId(platform, ptUnionId);
  }

  async findByUserId(userId: string): Promise<PlatformUser[]> {
    return this.platformUserRepo.findByUserId(userId);
  }

  async findActiveByPlatform(platform: Platform): Promise<PlatformUser[]> {
    return this.platformUserRepo.findActiveByPlatform(platform);
  }

  async findByPtUserId(
    platform: Platform,
    ptUserId: string,
  ): Promise<PlatformUser | null> {
    return this.platformUserRepo.findByPtUserId(platform, ptUserId);
  }

  async findByPtName(
    platform: Platform,
    displayName: string,
  ): Promise<PlatformUser | null> {
    return this.platformUserRepo.findByPtName(platform, displayName);
  }

  async findByPhoneHash(
    platform: Platform,
    countryCode: string,
    phoneHash: string,
  ): Promise<PlatformUser | null> {
    return this.platformUserRepo.findByPhoneHash(
      platform,
      countryCode,
      phoneHash,
    );
  }

  async findByPhoneHashWithoutLocalUser(
    platform: Platform,
    countryCode: string,
    phoneHash: string,
  ): Promise<PlatformUser | null> {
    return this.platformUserRepo.findByPhoneHashWithoutLocalUser(
      platform,
      countryCode,
      phoneHash,
    );
  }

  async upsert(
    where: { platform: Platform; ptUnionId: string },
    data: {
      ptUserId?: string;
      displayName?: string;
      countryCode?: string;
      phone?: string;
      phoneHash?: string;
      localUserId?: string;
    },
  ): Promise<PlatformUser> {
    return this.platformUserRepo.upsert(where, data);
  }

  async upsertMany(
    items: Array<{
      where: { platform: Platform; ptUnionId: string };
      data: {
        ptUserId?: string;
        displayName?: string;
        countryCode?: string;
        phone?: string;
        phoneHash?: string;
        localUserId?: string;
      };
    }>,
  ): Promise<PlatformUser[]> {
    return this.platformUserRepo.upsertMany(items);
  }

  async update(
    id: string,
    data: {
      ptUserId?: string;
      displayName?: string;
      countryCode?: string;
      phone?: string;
      phoneHash?: string;
      localUserId?: string;
      active?: boolean;
    },
  ): Promise<PlatformUser> {
    return this.platformUserRepo.update(id, data);
  }

  async updateLastSeen(id: string): Promise<PlatformUser> {
    return this.platformUserRepo.updateLastSeen(id);
  }

  async activate(id: string): Promise<PlatformUser> {
    return this.platformUserRepo.activate(id);
  }

  async deactivate(id: string): Promise<PlatformUser> {
    return this.platformUserRepo.deactivate(id);
  }

  async deleteById(id: string): Promise<PlatformUser> {
    return this.platformUserRepo.deleteById(id);
  }

  async deleteByPhone(countryCode: string, phone: string): Promise<number> {
    const result = await this.platformUserRepo.deleteByPhone(
      countryCode,
      phone,
    );
    return result.count;
  }
}
