-- CreateEnum
CREATE TYPE "ProfitShareRuleType" AS ENUM ('ORDER_PERCENTAGE', 'FIXED_MONTHLY');

-- AlterTable
ALTER TABLE "profit_share_rules" ADD COLUMN "rule_type" "ProfitShareRuleType" NOT NULL DEFAULT 'ORDER_PERCENTAGE';

-- AlterTable
ALTER TABLE "profit_share_modules" ADD COLUMN "fixed_amount" INTEGER,
ALTER COLUMN "share_ratio" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "profit_share_allocations" ADD COLUMN "fixed_amount" INTEGER,
ALTER COLUMN "allocation_ratio" SET DEFAULT 1.0000;

-- AlterTable
ALTER TABLE "profit_share_records" ALTER COLUMN "order_id" DROP NOT NULL,
ADD COLUMN "period_month" VARCHAR(7);

-- CreateIndex
CREATE INDEX "idx_profit_records_rule_member_period" ON "profit_share_records"("rule_id", "member_id", "period_month");
