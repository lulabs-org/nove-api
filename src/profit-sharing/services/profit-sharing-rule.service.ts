import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProfitShareRuleDto } from '../dto/create-profit-share-rule.dto';
import { UpdateProfitShareRuleDto } from '../dto/update-profit-share-rule.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { ProfitShareRuleType, ProfitShareRuleStatus } from '@prisma/client';
import { ProfitSharingRuleRepository } from '../repositories/profit-sharing-rule.repository';

@Injectable()
export class ProfitSharingRuleService {
  private readonly logger = new Logger(ProfitSharingRuleService.name);

  constructor(private readonly ruleRepository: ProfitSharingRuleRepository) {}

  /**
   * 创建新的分润规则
   */
  async createRule(dto: CreateProfitShareRuleDto) {
    const isFixedMonthly = dto.ruleType === ProfitShareRuleType.FIXED_MONTHLY;
    if (!isFixedMonthly && !dto.productId && !dto.channelId) {
      throw new BadRequestException(
        '按订单比例分润模式下，限制品类和限制渠道必须选择一项',
      );
    }

    return this.ruleRepository.createWithDetails({
      name: dto.name,
      ruleType: dto.ruleType ?? ProfitShareRuleType.ORDER_PERCENTAGE,
      productId: dto.productId,
      channelId: dto.channelId,
      validStartTime: new Date(dto.validStartTime),
      validEndTime: new Date(dto.validEndTime),
      status: dto.status,
      modules: {
        create: dto.modules.map((module) => ({
          name: module.name,
          shareRatio: new Decimal(module.shareRatio ?? 0),
          fixedAmount: module.fixedAmount,
          isRefundable: module.isRefundable ?? true,
          amortizationType: module.amortizationType ?? 'NONE',
          allocationMode: module.allocationMode ?? 'FIXED',
          allocations: {
            create: (module.allocations || []).map((allocation) => ({
              memberId: allocation.memberId,
              roleId: allocation.roleId,
              allocationRatio: new Decimal(allocation.allocationRatio ?? 1),
              fixedAmount: allocation.fixedAmount,
            })),
          },
        })),
      },
    });
  }

  /**
   * 更新分润规则
   */
  async updateRule(id: string, dto: UpdateProfitShareRuleDto) {
    try {
      const existing = await this.ruleRepository.findByIdWithDetails(id);
      const targetRuleType =
        dto.ruleType !== undefined ? dto.ruleType : existing?.ruleType;
      const isFixedMonthly =
        targetRuleType === ProfitShareRuleType.FIXED_MONTHLY;

      if (
        !isFixedMonthly &&
        (dto.productId !== undefined || dto.channelId !== undefined)
      ) {
        const finalProductId =
          dto.productId !== undefined ? dto.productId : existing?.productId;
        const finalChannelId =
          dto.channelId !== undefined ? dto.channelId : existing?.channelId;
        if (!finalProductId && !finalChannelId) {
          throw new BadRequestException(
            '按订单比例分润模式下，限制品类和限制渠道必须选择一项',
          );
        }
      }

      return await this.ruleRepository.updateWithDetails(id, {
        name: dto.name,
        ruleType: dto.ruleType,
        productId: dto.productId,
        channelId: dto.channelId,
        validStartTime: dto.validStartTime
          ? new Date(dto.validStartTime)
          : undefined,
        validEndTime: dto.validEndTime ? new Date(dto.validEndTime) : undefined,
        status: dto.status,
        // 完全覆盖现有的 modules
        ...(dto.modules && {
          modules: {
            deleteMany: {
              id: {
                notIn: dto.modules.map((m) => m.id).filter(Boolean) as string[],
              },
            },
            update: dto.modules
              .filter((m) => m.id)
              .map((m) => ({
                where: { id: m.id },
                data: {
                  name: m.name,
                  shareRatio: new Decimal(m.shareRatio ?? 0),
                  fixedAmount: m.fixedAmount,
                  isRefundable: m.isRefundable ?? true,
                  amortizationType: m.amortizationType ?? 'NONE',
                  allocationMode: m.allocationMode ?? 'FIXED',
                  allocations: {
                    deleteMany: {
                      id: {
                        notIn: (m.allocations || [])
                          .map((a) => a.id)
                          .filter(Boolean) as string[],
                      },
                    },
                    update: (m.allocations || [])
                      .filter((a) => a.id)
                      .map((a) => ({
                        where: { id: a.id },
                        data: {
                          memberId: a.memberId,
                          roleId: a.roleId,
                          allocationRatio: new Decimal(a.allocationRatio ?? 1),
                          fixedAmount: a.fixedAmount,
                        },
                      })),
                    create: (m.allocations || [])
                      .filter((a) => !a.id)
                      .map((a) => ({
                        memberId: a.memberId,
                        roleId: a.roleId,
                        allocationRatio: new Decimal(a.allocationRatio ?? 1),
                        fixedAmount: a.fixedAmount,
                      })),
                  },
                },
              })),
            create: dto.modules
              .filter((m) => !m.id)
              .map((module) => ({
                name: module.name,
                shareRatio: new Decimal(module.shareRatio ?? 0),
                fixedAmount: module.fixedAmount,
                isRefundable: module.isRefundable ?? true,
                amortizationType: module.amortizationType ?? 'NONE',
                allocationMode: module.allocationMode ?? 'FIXED',
                allocations: {
                  create: module.allocations
                    ? module.allocations.map((allocation) => ({
                        memberId: allocation.memberId,
                        roleId: allocation.roleId,
                        allocationRatio: new Decimal(
                          allocation.allocationRatio ?? 1,
                        ),
                        fixedAmount: allocation.fixedAmount,
                      }))
                    : [],
                },
              })),
          },
        }),
      });
    } catch (error) {
      this.logger.error(`Error updating rule ${id}:`, error);
      throw error;
    }
  }

  /**
   * 根据ID获取规则详情
   */
  async getRuleById(id: string) {
    return this.ruleRepository.findByIdWithDetails(id);
  }

  /**
   * 获取规则列表
   */
  async getRules() {
    return this.ruleRepository.findAllWithDetails();
  }

  /**
   * 单条规则复制
   */
  async duplicateRule(
    id: string,
    dto?: {
      name?: string;
      validStartTime?: string;
      validEndTime?: string;
      status?: ProfitShareRuleStatus;
    },
  ) {
    const source = await this.ruleRepository.findByIdWithDetails(id);
    if (!source) {
      throw new NotFoundException(`规则 ${id} 不存在`);
    }

    const newName = dto?.name || `${source.name} (副本)`;
    const validStartTime = dto?.validStartTime
      ? new Date(dto.validStartTime)
      : source.validStartTime;
    const validEndTime = dto?.validEndTime
      ? new Date(dto.validEndTime)
      : source.validEndTime;
    const status = dto?.status || ProfitShareRuleStatus.ACTIVE;

    return this.ruleRepository.createWithDetails({
      name: newName,
      ruleType: source.ruleType,
      productId: source.productId,
      channelId: source.channelId,
      validStartTime,
      validEndTime,
      status,
      modules: {
        create: source.modules.map((m) => ({
          name: m.name,
          shareRatio: m.shareRatio,
          fixedAmount: m.fixedAmount,
          isRefundable: m.isRefundable,
          amortizationType: m.amortizationType,
          allocationMode: m.allocationMode,
          allocations: {
            create: m.allocations.map((a) => ({
              memberId: a.memberId,
              roleId: a.roleId,
              allocationRatio: a.allocationRatio,
              fixedAmount: a.fixedAmount,
            })),
          },
        })),
      },
    });
  }

  /**
   * 批量复制规则
   */
  async batchDuplicateRules(dto: {
    ruleIds: string[];
    periodStrategy?: 'NEXT_MONTH' | 'SPECIFIC_MONTH' | 'CUSTOM_RANGE' | 'KEEP';
    targetMonth?: string;
    customStartTime?: string;
    customEndTime?: string;
    nameSuffix?: string;
    status?: ProfitShareRuleStatus;
  }) {
    const results: any[] = [];
    const strategy = dto.periodStrategy || 'NEXT_MONTH';

    for (const id of dto.ruleIds) {
      const source = await this.ruleRepository.findByIdWithDetails(id);
      if (!source) continue;

      const sourceStart = new Date(source.validStartTime);
      const sourceEnd = new Date(source.validEndTime);
      const isPermanent = sourceEnd.getFullYear() >= 2090;

      let targetStart = sourceStart;
      let targetEnd = sourceEnd;
      let newName = '';

      if (strategy === 'NEXT_MONTH') {
        targetStart = new Date(sourceStart);
        targetStart.setMonth(targetStart.getMonth() + 1);

        if (isPermanent) {
          targetEnd = sourceEnd;
        } else {
          targetEnd = new Date(sourceEnd);
          targetEnd.setMonth(targetEnd.getMonth() + 1);
        }
        newName = this.shiftMonthInName(
          source.name,
          sourceStart,
          targetStart,
          dto.nameSuffix,
        );
      } else if (strategy === 'SPECIFIC_MONTH' && dto.targetMonth) {
        const [y, m] = dto.targetMonth.split('-').map(Number);
        targetStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
        targetEnd = new Date(y, m, 0, 23, 59, 59, 999);
        newName = this.shiftMonthInName(
          source.name,
          sourceStart,
          targetStart,
          dto.nameSuffix,
        );
      } else if (
        strategy === 'CUSTOM_RANGE' &&
        dto.customStartTime &&
        dto.customEndTime
      ) {
        targetStart = new Date(dto.customStartTime);
        targetEnd = new Date(dto.customEndTime);
        newName = `${source.name}${dto.nameSuffix || ' (副本)'}`;
      } else {
        // KEEP
        targetStart = sourceStart;
        targetEnd = sourceEnd;
        newName = `${source.name}${dto.nameSuffix || ' (副本)'}`;
      }

      const created = await this.ruleRepository.createWithDetails({
        name: newName,
        ruleType: source.ruleType,
        productId: source.productId,
        channelId: source.channelId,
        validStartTime: targetStart,
        validEndTime: targetEnd,
        status: dto.status || ProfitShareRuleStatus.ACTIVE,
        modules: {
          create: source.modules.map((m) => ({
            name: m.name,
            shareRatio: m.shareRatio,
            fixedAmount: m.fixedAmount,
            isRefundable: m.isRefundable,
            amortizationType: m.amortizationType,
            allocationMode: m.allocationMode,
            allocations: {
              create: m.allocations.map((a) => ({
                memberId: a.memberId,
                roleId: a.roleId,
                allocationRatio: a.allocationRatio,
                fixedAmount: a.fixedAmount,
              })),
            },
          })),
        },
      });

      results.push(created);
    }

    return {
      success: true,
      totalRequested: dto.ruleIds.length,
      duplicatedCount: results.length,
      items: results,
    };
  }

  private shiftMonthInName(
    name: string,
    fromStart: Date,
    toStart: Date,
    nameSuffix?: string,
  ): string {
    if (nameSuffix) {
      return `${name}${nameSuffix}`;
    }

    const fromYear = fromStart.getFullYear();
    const fromMonth = fromStart.getMonth() + 1;
    const toYear = toStart.getFullYear();
    const toMonth = toStart.getMonth() + 1;

    const newName = name;
    if (newName.includes(`${fromYear}年${fromMonth}月`)) {
      return newName.replace(
        `${fromYear}年${fromMonth}月`,
        `${toYear}年${toMonth}月`,
      );
    }
    const fromMonthPadded = String(fromMonth).padStart(2, '0');
    const toMonthPadded = String(toMonth).padStart(2, '0');
    if (newName.includes(`${fromYear}-${fromMonthPadded}`)) {
      return newName.replace(
        `${fromYear}-${fromMonthPadded}`,
        `${toYear}-${toMonthPadded}`,
      );
    }
    if (newName.includes(`${fromMonth}月`)) {
      return newName.replace(`${fromMonth}月`, `${toMonth}月`);
    }

    return `${name} (副本)`;
  }

  /**
   * 删除规则（软删除）
   */
  async deleteRule(id: string) {
    const existing = await this.ruleRepository.findByIdWithDetails(id);
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`规则 ${id} 不存在或已被删除`);
    }
    return this.ruleRepository.delete(id);
  }

  /**
   * 切换规则启用/停用状态
   */
  async toggleRuleStatus(id: string, newStatus?: ProfitShareRuleStatus) {
    const existing = await this.ruleRepository.findByIdWithDetails(id);
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`规则 ${id} 不存在`);
    }

    const nextStatus =
      newStatus ||
      (existing.status === ProfitShareRuleStatus.ACTIVE
        ? ProfitShareRuleStatus.INACTIVE
        : ProfitShareRuleStatus.ACTIVE);

    return this.ruleRepository.updateStatus(id, nextStatus);
  }
}
