-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "settle_info" JSONB,
ADD COLUMN     "settled_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "idx_orders_settled_at" ON "orders"("settled_at");
