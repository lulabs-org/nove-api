import { Prisma } from '@prisma/client';

/**
 * 分润规则生效周期顺延/复制策略
 * - NEXT_MONTH: 顺延至下月
 * - SPECIFIC_MONTH: 指定自然月
 * - CUSTOM_RANGE: 自定义区间
 * - KEEP: 保持原周期
 */
export type PeriodStrategy =
  | 'NEXT_MONTH'
  | 'SPECIFIC_MONTH'
  | 'CUSTOM_RANGE'
  | 'KEEP';

/**
 * 带有模块与人员分配详情的完整分润规则 Payload
 */
export type RuleWithDetails = Prisma.ProfitShareRuleGetPayload<{
  include: {
    modules: {
      include: {
        allocations: true;
      };
    };
  };
}>;

/**
 * 分润流水查询分页与过滤选项
 */
export interface RecordQueryOptions {
  where?: Prisma.ProfitShareRecordWhereInput;
  skip?: number;
  take?: number;
}
