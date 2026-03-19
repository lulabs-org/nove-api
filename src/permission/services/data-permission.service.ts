import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataPermRepository } from '../repositories';
import {
  CreateDataPermissionRuleDto,
  UpdateDataPermissionRuleDto,
  QueryDataPermissionRuleDto,
  DataPermissionRuleDto,
  DataPermissionRuleListResponse,
} from '../dto';
import { DataPermissionRule } from '@prisma/client';

interface DataPermissionRuleWithFields extends DataPermissionRule {
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DataPermService {
  private readonly logger = new Logger(DataPermService.name);

  constructor(private readonly dataPermRepo: DataPermRepository) {}

  async createDataPermRule(
    dto: CreateDataPermissionRuleDto,
  ): Promise<DataPermissionRuleDto> {
    const codeExists = await this.dataPermRepo.checkCodeExists(dto.code);
    if (codeExists) {
      throw new BadRequestException(
        `Data permission rule code "${dto.code}" already exists`,
      );
    }

    const rule = await this.dataPermRepo.create(dto);
    return this.toDataPermissionRuleDto(rule);
  }

  async findDataPermissionRuleById(id: string): Promise<DataPermissionRuleDto> {
    const rule = await this.dataPermRepo.findById(id);
    if (!rule) {
      throw new NotFoundException('Data permission rule not found');
    }

    return this.toDataPermissionRuleDto(rule);
  }

  async findDataPermRuleByCode(code: string): Promise<DataPermissionRuleDto> {
    const rule = await this.dataPermRepo.findByCode(code);
    if (!rule) {
      throw new NotFoundException('Data permission rule not found');
    }

    return this.toDataPermissionRuleDto(rule);
  }

  async findAllDataPermRules(
    query: QueryDataPermissionRuleDto,
  ): Promise<DataPermissionRuleListResponse> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, any> = {};

    if (query.name) {
      where.name = { contains: query.name };
    }

    if (query.code) {
      where.code = query.code;
    }

    if (query.resource) {
      where.resource = query.resource;
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    const { items, total } = await this.dataPermRepo.findByResource({
      skip,
      take: pageSize,
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: items.map((item) => this.toDataPermissionRuleDto(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateDataPermRule(
    id: string,
    dto: UpdateDataPermissionRuleDto,
  ): Promise<DataPermissionRuleDto> {
    const existingRule = await this.dataPermRepo.findById(id);
    if (!existingRule) {
      throw new NotFoundException('Data permission rule not found');
    }

    const updatedRule = await this.dataPermRepo.update(id, dto);
    return this.toDataPermissionRuleDto(updatedRule);
  }

  async deleteDataPermissionRule(id: string): Promise<void> {
    const existingRule = await this.dataPermRepo.findById(id);
    if (!existingRule) {
      throw new NotFoundException('Data permission rule not found');
    }

    await this.dataPermRepo.delete(id);
  }

  private toDataPermissionRuleDto(
    rule: DataPermissionRuleWithFields,
  ): DataPermissionRuleDto {
    return {
      id: rule.id,
      name: rule.name,
      code: rule.code,
      description: rule.description,
      resource: rule.resource,
      condition: rule.condition,
      active: rule.active,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
