BEGIN;

UPDATE "orders"
SET "status" = 'CANCELLED'
WHERE "status" = 'REFUNDED';

ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "OrderStatus_new" AS ENUM (
  'UNPAID',
  'PAID',
  'CANCELLED',
  'COMPLETED'
);

ALTER TABLE "orders"
ALTER COLUMN "status" TYPE "OrderStatus_new"
USING ("status"::text::"OrderStatus_new");

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'UNPAID';

COMMIT;
