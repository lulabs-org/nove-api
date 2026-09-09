-- CreateEnum
CREATE TYPE "BenefitAdjustmentType" AS ENUM ('FREEZE', 'UNFREEZE', 'EXTENSION');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'FROZEN';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "frozen_at" TIMESTAMPTZ(6),
ADD COLUMN     "frozen_days" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "order_benefit_adjustments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "type" "BenefitAdjustmentType" NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 0,
    "freeze_start" TIMESTAMPTZ(6),
    "freeze_end" TIMESTAMPTZ(6),
    "before_end" TIMESTAMPTZ(6) NOT NULL,
    "after_end" TIMESTAMPTZ(6) NOT NULL,
    "reason" TEXT,
    "operator_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "order_benefit_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_order_benefit_adjustments_order_id" ON "order_benefit_adjustments"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_benefit_adjustments_operator_id" ON "order_benefit_adjustments"("operator_id");

-- CreateIndex
CREATE INDEX "idx_order_benefit_adjustments_type" ON "order_benefit_adjustments"("type");

-- CreateIndex
CREATE INDEX "idx_order_benefit_adjustments_created_at" ON "order_benefit_adjustments"("created_at");

-- AddForeignKey
ALTER TABLE "order_benefit_adjustments" ADD CONSTRAINT "order_benefit_adjustments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_benefit_adjustments" ADD CONSTRAINT "order_benefit_adjustments_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
