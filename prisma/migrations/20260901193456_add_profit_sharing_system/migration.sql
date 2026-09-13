-- CreateEnum
CREATE TYPE "ProfitShareRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProfitShareRecordStatus" AS ENUM ('PENDING', 'SETTLED', 'CLAWBACK', 'CANCELLED');

-- CreateTable
CREATE TABLE "profit_share_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product_id" TEXT,
    "channel_id" INTEGER,
    "valid_start_time" TIMESTAMPTZ(6) NOT NULL,
    "valid_end_time" TIMESTAMPTZ(6) NOT NULL,
    "status" "ProfitShareRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "profit_share_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_share_modules" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "share_ratio" DECIMAL(8,4) NOT NULL,
    "is_refundable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profit_share_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_share_allocations" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "member_id" TEXT,
    "role_id" TEXT,
    "allocation_ratio" DECIMAL(8,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profit_share_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_share_records" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "rule_snapshot" JSONB NOT NULL,
    "base_amount" INTEGER NOT NULL,
    "profit_amount" INTEGER NOT NULL,
    "settlement_time" TIMESTAMPTZ(6),
    "status" "ProfitShareRecordStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "profit_share_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_profit_rules_product_channel" ON "profit_share_rules"("product_id", "channel_id");

-- CreateIndex
CREATE INDEX "idx_profit_rules_valid_time" ON "profit_share_rules"("valid_start_time", "valid_end_time");

-- CreateIndex
CREATE INDEX "idx_profit_modules_rule_id" ON "profit_share_modules"("rule_id");

-- CreateIndex
CREATE INDEX "idx_profit_alloc_module_id" ON "profit_share_allocations"("module_id");

-- CreateIndex
CREATE INDEX "idx_profit_records_order_id" ON "profit_share_records"("order_id");

-- CreateIndex
CREATE INDEX "idx_profit_records_member_status" ON "profit_share_records"("member_id", "status");

-- CreateIndex
CREATE INDEX "idx_profit_records_status_time" ON "profit_share_records"("status", "settlement_time");

-- AddForeignKey
ALTER TABLE "profit_share_modules" ADD CONSTRAINT "profit_share_modules_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "profit_share_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_share_allocations" ADD CONSTRAINT "profit_share_allocations_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "profit_share_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_share_records" ADD CONSTRAINT "profit_share_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_share_records" ADD CONSTRAINT "profit_share_records_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "profit_share_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_share_records" ADD CONSTRAINT "profit_share_records_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "profit_share_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
