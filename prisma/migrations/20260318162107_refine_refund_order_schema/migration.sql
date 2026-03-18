/*
  Warnings:

  - You are about to drop the column `afterSaleCode` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `applicantName` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `approvalUrl` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `benefitEndedAt` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `benefitUsedDays` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `financialNote` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `financialSettledAt` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `isFinancialSettled` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `productCategory` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `refundAmount` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `refundChannel` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `refundReason` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `refundedAt` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `submittedAt` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `order_refunds` table. All the data in the column will be lost.
  - You are about to drop the column `activeDays` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `amountCny` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `benefitDaysRemaining` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `benefitDurationDays` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `benefitStartDate` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `effectiveDate` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `externalOrderData` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `financial_closed` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `orders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[after_sale_code]` on the table `order_refunds` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_id,after_sale_code]` on the table `order_refunds` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[channel_id,external_order_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `after_sale_code` to the `order_refunds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `order_refunds` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Made the column `currency` on table `orders` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('UNPAID', 'PAID', 'CANCELLED', 'REFUNDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL', 'WECHAT', 'ALIPAY', 'APPLE_PAY', 'GOOGLE_PAY', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SETTLED');

-- CreateEnum
CREATE TYPE "RefundChannel" AS ENUM ('DOUYIN', 'ALIPAY', 'WECHAT', 'STRIPE', 'PAYPAL', 'MANUAL', 'OTHER');

-- DropForeignKey
ALTER TABLE "public"."order_refunds" DROP CONSTRAINT "order_refunds_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "public"."order_refunds" DROP CONSTRAINT "order_refunds_orderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."order_refunds" DROP CONSTRAINT "order_refunds_parentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_user_id_fkey";

-- DropIndex
DROP INDEX "public"."order_refunds_createdBy_idx";

-- DropIndex
DROP INDEX "public"."order_refunds_isFinancialSettled_idx";

-- DropIndex
DROP INDEX "public"."order_refunds_isFinancialSettled_submittedAt_idx";

-- DropIndex
DROP INDEX "public"."order_refunds_orderId_idx";

-- DropIndex
DROP INDEX "public"."order_refunds_submittedAt_idx";

-- DropIndex
DROP INDEX "public"."orders_channel_id_idx";

-- DropIndex
DROP INDEX "public"."orders_effectiveDate_idx";

-- DropIndex
DROP INDEX "public"."orders_financial_closed_idx";

-- DropIndex
DROP INDEX "public"."orders_financial_closed_paidAt_idx";

-- DropIndex
DROP INDEX "public"."orders_paidAt_idx";

-- DropIndex
DROP INDEX "public"."orders_product_id_idx";

-- DropIndex
DROP INDEX "public"."orders_user_id_idx";

-- DropIndex
DROP INDEX "public"."orders_user_id_paidAt_idx";

-- AlterTable
ALTER TABLE "order_refunds" DROP COLUMN "afterSaleCode",
DROP COLUMN "applicantName",
DROP COLUMN "approvalUrl",
DROP COLUMN "benefitEndedAt",
DROP COLUMN "benefitUsedDays",
DROP COLUMN "createdAt",
DROP COLUMN "createdBy",
DROP COLUMN "financialNote",
DROP COLUMN "financialSettledAt",
DROP COLUMN "isFinancialSettled",
DROP COLUMN "orderId",
DROP COLUMN "parentId",
DROP COLUMN "productCategory",
DROP COLUMN "refundAmount",
DROP COLUMN "refundChannel",
DROP COLUMN "refundReason",
DROP COLUMN "refundedAt",
DROP COLUMN "submittedAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "after_sale_code" TEXT NOT NULL,
ADD COLUMN     "applicant_name" TEXT,
ADD COLUMN     "approval_url" TEXT,
ADD COLUMN     "benefit_used_days" INTEGER,
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "financial_note" TEXT,
ADD COLUMN     "financial_settled_at" TIMESTAMPTZ(6),
ADD COLUMN     "order_id" TEXT,
ADD COLUMN     "parent_id" TEXT,
ADD COLUMN     "product_category" TEXT,
ADD COLUMN     "refund_amount" INTEGER,
ADD COLUMN     "refund_channel" "RefundChannel",
ADD COLUMN     "refund_reason" TEXT,
ADD COLUMN     "refunded_at" TIMESTAMPTZ(6),
ADD COLUMN     "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "submitted_at" TIMESTAMPTZ(6),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "activeDays",
DROP COLUMN "amountCny",
DROP COLUMN "benefitDaysRemaining",
DROP COLUMN "benefitDurationDays",
DROP COLUMN "benefitStartDate",
DROP COLUMN "createdAt",
DROP COLUMN "effectiveDate",
DROP COLUMN "externalOrderData",
DROP COLUMN "financial_closed",
DROP COLUMN "paidAt",
DROP COLUMN "updatedAt",
DROP COLUMN "user_id",
ADD COLUMN     "amount_cny" INTEGER,
ADD COLUMN     "benefit_end" TIMESTAMPTZ(6),
ADD COLUMN     "benefit_start" TIMESTAMPTZ(6),
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "effective_at" TIMESTAMPTZ(6),
ADD COLUMN     "fx_locked_at" TIMESTAMPTZ(6),
ADD COLUMN     "fx_rate_to_cny" DECIMAL(18,8),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "paid_at" TIMESTAMPTZ(6),
ADD COLUMN     "payment_provider" "PaymentProvider",
ADD COLUMN     "provider_trade_no" TEXT,
ADD COLUMN     "purchaser_id" TEXT,
ADD COLUMN     "refunded_at" TIMESTAMPTZ(6),
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ALTER COLUMN "currency" SET NOT NULL,
ALTER COLUMN "currency" SET DEFAULT 'CNY',
ALTER COLUMN "financial_closed_at" SET DATA TYPE TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "idx_order_refunds_order_id" ON "order_refunds"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_refunds_created_by" ON "order_refunds"("created_by");

-- CreateIndex
CREATE INDEX "idx_order_refunds_parent_id" ON "order_refunds"("parent_id");

-- CreateIndex
CREATE INDEX "idx_order_refunds_status" ON "order_refunds"("status");

-- CreateIndex
CREATE INDEX "idx_order_refunds_submitted_at" ON "order_refunds"("submitted_at");

-- CreateIndex
CREATE INDEX "idx_order_refunds_refunded_at" ON "order_refunds"("refunded_at");

-- CreateIndex
CREATE INDEX "idx_order_refunds_status_submitted_at" ON "order_refunds"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "idx_order_refunds_status_financial_settled_at" ON "order_refunds"("status", "financial_settled_at");

-- CreateIndex
CREATE INDEX "idx_order_refunds_order_status" ON "order_refunds"("order_id", "status");

-- CreateIndex
CREATE INDEX "idx_order_refunds_order_submitted_at" ON "order_refunds"("order_id", "submitted_at");

-- CreateIndex
CREATE INDEX "idx_order_refunds_deleted_at" ON "order_refunds"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uk_order_refunds_after_sale_code" ON "order_refunds"("after_sale_code");

-- CreateIndex
CREATE UNIQUE INDEX "uk_order_refunds_order_after_sale_code" ON "order_refunds"("order_id", "after_sale_code");

-- CreateIndex
CREATE INDEX "idx_orders_purchaser_created_at" ON "orders"("purchaser_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_orders_purchaser_status" ON "orders"("purchaser_id", "status");

-- CreateIndex
CREATE INDEX "idx_orders_channel_created_at" ON "orders"("channel_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_orders_status_paid_at" ON "orders"("status", "paid_at");

-- CreateIndex
CREATE INDEX "idx_orders_paid_at" ON "orders"("paid_at");

-- CreateIndex
CREATE INDEX "idx_orders_financial_closed_at" ON "orders"("financial_closed_at");

-- CreateIndex
CREATE INDEX "idx_orders_channel_fin_closed_at" ON "orders"("channel_id", "financial_closed_at");

-- CreateIndex
CREATE INDEX "idx_orders_product_created_at" ON "orders"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_orders_deleted_at" ON "orders"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uk_orders_channel_external_id" ON "orders"("channel_id", "external_order_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_purchaser_id_fkey" FOREIGN KEY ("purchaser_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "order_refunds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "orders_current_owner_id_idx" RENAME TO "idx_orders_current_owner_id";

-- RenameIndex
ALTER INDEX "orders_order_code_key" RENAME TO "uk_orders_order_code";

-- RenameIndex
ALTER INDEX "orders_order_number_key" RENAME TO "uk_orders_order_number";
