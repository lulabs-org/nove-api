import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrganizationRepository } from '../repositories/organization.repository';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  PaginationDto,
  OrganizationDto,
  OrganizationListResponse,
  OrganizationStatsDto,
} from '../dto';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async createOrganization(
    dto: CreateOrganizationDto,
  ): Promise<OrganizationDto> {
    const existingOrg = await this.organizationRepository.findByCode(dto.code);
    if (existingOrg) {
      throw new BadRequestException('Organization code already exists');
    }

    const organization = await this.organizationRepository.create({
      name: dto.name,
      code: dto.code,
      logo: dto.logo,
      description: dto.description,
      parent: dto.parentId
        ? {
            connect: { id: dto.parentId },
          }
        : undefined,
      level: dto.level || 1,
      sortOrder: dto.sortOrder || 0,
      active: dto.active !== undefined ? dto.active : true,
    });

    return this.toDto(organization);
  }

  async listOrganizations(
    pagination?: PaginationDto,
  ): Promise<OrganizationListResponse> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrgWhereInput = {
      deletedAt: null,
    };

    if (pagination?.keyword) {
      where.OR = [
        { name: { contains: pagination.keyword, mode: 'insensitive' } },
        { code: { contains: pagination.keyword, mode: 'insensitive' } },
      ];
    }

    const { items, total } = await this.organizationRepository.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      where,
    });

    return {
      items: items.map((item) => this.toDto(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getOrganization(id: string): Promise<OrganizationDto> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.toDto(organization);
  }

  async updateOrganization(
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationDto> {
    const existingOrg = await this.organizationRepository.findById(id);
    if (!existingOrg) {
      throw new NotFoundException('Organization not found');
    }

    if (dto.code && dto.code !== existingOrg.code) {
      const codeExists = await this.organizationRepository.findByCode(dto.code);
      if (codeExists) {
        throw new BadRequestException('Organization code already exists');
      }
    }

    const organization = await this.organizationRepository.update(id, {
      name: dto.name,
      code: dto.code,
      logo: dto.logo,
      description: dto.description,
      parent: dto.parentId
        ? {
            connect: { id: dto.parentId },
          }
        : dto.parentId === null
          ? {
              disconnect: true,
            }
          : undefined,
      level: dto.level,
      sortOrder: dto.sortOrder,
      active: dto.active,
    });

    return this.toDto(organization);
  }

  async updateStatus(id: string, active: boolean): Promise<OrganizationDto> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const updated = await this.organizationRepository.updateStatus(id, active);
    return this.toDto(updated);
  }

  async deleteOrganization(id: string): Promise<void> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.organizationRepository.softDelete(id);
  }

  async getOrganizationStats(id: string): Promise<OrganizationStatsDto> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const stats = await this.organizationRepository.getStats(id);

    return {
      totalUsers: stats.totalUsers,
      totalDepartments: stats.totalDepartments,
      disabledUsers: stats.disabledUsers,
      activeUsers: stats.activeUsers,
      adminUsers: stats.adminUsers,
      totalApiKeys: stats.totalApiKeys,
      activeApiKeys: stats.activeApiKeys,
    };
  }

  private toDto(organization: {
    id: string;
    name: string;
    code: string;
    logo: string | null;
    description: string | null;
    parentId: string | null;
    level: number;
    sortOrder: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): OrganizationDto {
    return {
      id: organization.id,
      name: organization.name,
      code: organization.code,
      logo: organization.logo,
      description: organization.description,
      parentId: organization.parentId,
      level: organization.level,
      sortOrder: organization.sortOrder,
      active: organization.active,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      deletedAt: organization.deletedAt,
    };
  }
}
