-- DropForeignKey
ALTER TABLE "public"."profit_share_records" DROP CONSTRAINT "profit_share_records_order_id_fkey";

-- AlterTable
ALTER TABLE "profit_share_modules" ADD COLUMN     "amortization_type" TEXT NOT NULL DEFAULT 'NONE',
ALTER COLUMN "allocation_mode" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "profit_share_records" ALTER COLUMN "period_month" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "profit_share_records" ADD CONSTRAINT "profit_share_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
