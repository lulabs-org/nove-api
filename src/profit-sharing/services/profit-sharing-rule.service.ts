import { Injectable, Logger } from '@nestjs/common';
import { CreateProfitShareRuleDto } from '../dto/create-profit-share-rule.dto';
import { UpdateProfitShareRuleDto } from '../dto/update-profit-share-rule.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { ProfitSharingRuleRepository } from '../repositories/profit-sharing-rule.repository';

@Injectable()
export class ProfitSharingRuleService {
  private readonly logger = new Logger(ProfitSharingRuleService.name);

  constructor(private readonly ruleRepository: ProfitSharingRuleRepository) {}

  /**
   * 创建新的分润规则
   */
  async createRule(dto: CreateProfitShareRuleDto) {
    return this.ruleRepository.createWithDetails({
      name: dto.name,
      productId: dto.productId,
      channelId: dto.channelId,
      validStartTime: new Date(dto.validStartTime),
      validEndTime: new Date(dto.validEndTime),
      status: dto.status,
      modules: {
        create: dto.modules.map((module) => ({
          name: module.name,
          shareRatio: new Decimal(module.shareRatio),
          isRefundable: module.isRefundable ?? true,
          allocations: {
            create: module.allocations.map((allocation) => ({
              memberId: allocation.memberId,
              roleId: allocation.roleId,
              allocationRatio: new Decimal(allocation.allocationRatio),
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
      return await this.ruleRepository.updateWithDetails(id, {
        name: dto.name,
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
                  shareRatio: new Decimal(m.shareRatio),
                  isRefundable: m.isRefundable ?? true,
                  amortizationType: m.amortizationType ?? 'NONE',
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
                          allocationRatio: new Decimal(a.allocationRatio),
                        },
                      })),
                    create: (m.allocations || [])
                      .filter((a) => !a.id)
                      .map((a) => ({
                        memberId: a.memberId,
                        roleId: a.roleId,
                        allocationRatio: new Decimal(a.allocationRatio),
                      })),
                  },
                },
              })),
            create: dto.modules
              .filter((m) => !m.id)
              .map((module) => ({
                name: module.name,
                shareRatio: new Decimal(module.shareRatio),
                isRefundable: module.isRefundable ?? true,
                amortizationType: module.amortizationType ?? 'NONE',
                allocations: {
                  create: module.allocations
                    ? module.allocations.map((allocation) => ({
                        memberId: allocation.memberId,
                        roleId: allocation.roleId,
                        allocationRatio: new Decimal(
                          allocation.allocationRatio,
                        ),
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
}
