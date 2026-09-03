/**
 * 工资条与薪资统计相关数据模型及枚举
 */

/**
 * 薪酬款项类别枚举
 */
export enum PayslipItemCategory {
  BASE_SALARY = 'BASE_SALARY', // 基本底薪 / 固定课酬
  COMMISSION = 'COMMISSION', // 订单提成 / 销售分润
  BONUS = 'BONUS', // 各类奖金（绩效、销冠、全勤等）
  SUBSIDY = 'SUBSIDY', // 津贴与补贴（餐补、车补、话费等）
  DEDUCTION = 'DEDUCTION', // 扣减项（考勤迟到、缺勤、代扣等）
}

/**
 * 员工月度工资条汇总数据项
 */
export interface PayslipSummaryItem {
  memberId: string;
  memberName: string;
  username?: string;
  memberRole?: string;
  departmentName?: string;
  phone?: string;
  month: string;
  // 5大薪资板块
  baseSalaryAmount: number; // 分 (底薪/课酬)
  commissionAmount: number; // 分 (订单提成)
  bonusAmount: number; // 分 (各类奖金)
  subsidyAmount: number; // 分 (津贴补贴)
  deductionAmount: number; // 分 (各项扣除)
  // 兼顾向后兼容字段
  fixedAmount: number; // 分 = baseSalaryAmount
  clawbackAmount: number; // 分 = deductionAmount
  // 项数统计
  orderCount: number;
  bonusCount: number;
  subsidyCount: number;
  deductionCount: number;
  // 汇总
  totalGrossAmount: number; // 分: baseSalary + commission + bonus + subsidy - deduction
  settledAmount: number; // 分
  pendingAmount: number; // 分
  status: 'SETTLED' | 'PENDING' | 'PARTIALLY_SETTLED';
}

/**
 * 月度工资条全局总览统计
 */
export interface PayslipMonthStats {
  month: string;
  totalGrossAmount: number; // 分
  totalBaseSalaryAmount: number; // 分
  totalCommissionAmount: number; // 分
  totalBonusAmount: number; // 分
  totalSubsidyAmount: number; // 分
  totalDeductionAmount: number; // 分
  totalSettledAmount: number; // 分
  totalPendingAmount: number; // 分
  totalMembers: number;
}

/**
 * 月度工资条列表接口响应
 */
export interface PayslipsResponse {
  month: string;
  stats: PayslipMonthStats;
  items: PayslipSummaryItem[];
}

/**
 * 历史趋势单个自然月数据点
 */
export interface HistoricalMonthPoint {
  month: string;
  label: string;
  baseSalaryAmount: number;
  commissionAmount: number;
  bonusAmount: number;
  subsidyAmount: number;
  deductionAmount: number;
  totalGrossAmount: number;
  settledAmount: number;
  pendingAmount: number;
  memberCount: number;
}

/**
 * 成员历史薪资走势系列
 */
export interface MemberHistoricalSeries {
  memberId: string;
  memberName: string;
  memberRole?: string;
  departmentName?: string;
  color: string;
  totalGrossAmount: number;
  totalSettledAmount: number;
  totalPendingAmount: number;
  avgMonthlyGross: number;
  monthlyPoints: Array<{
    month: string;
    label: string;
    baseSalaryAmount: number;
    commissionAmount: number;
    bonusAmount: number;
    subsidyAmount: number;
    deductionAmount: number;
    totalGrossAmount: number;
  }>;
}

/**
 * 历史薪资统计图表聚合响应
 */
export interface HistoricalSalaryStatsResponse {
  months: HistoricalMonthPoint[];
  overall: {
    totalGrossAmount: number;
    totalSettledAmount: number;
    totalPendingAmount: number;
    avgMonthlyGross: number;
    maxMonthlyGross: number;
  };
  categoryTotals: {
    baseSalaryAmount: number;
    commissionAmount: number;
    bonusAmount: number;
    subsidyAmount: number;
    deductionAmount: number;
  };
  members: Array<{
    id: string;
    name: string;
    role?: string;
    department?: string;
  }>;
  memberSeries: MemberHistoricalSeries[];
  selectedMember?: {
    id: string;
    name: string;
    role?: string;
    department?: string;
  };
}

/**
 * 获取月度工资条列表查询选项
 */
export interface GetPayslipsOptions {
  month?: string;
  keyword?: string;
}

/**
 * 获取历史薪资走势查询选项
 */
export interface GetHistoricalSalaryStatsOptions {
  memberId?: string;
  months?: number;
}

/**
 * 获取员工个人月度工资条明细查询选项
 */
export interface GetPayslipDetailOptions {
  month?: string;
}
