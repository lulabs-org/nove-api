/*
  Warnings:

  - You are about to drop the column `archivedAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `downloadUrl` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `durationDays` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `externalUrl` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `isFeatured` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `isRecommended` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `maxUsers` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `originalPrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `productCode` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `reviewCount` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `salesCount` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `shortDescription` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `updatedBy` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `videoUrl` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `viewCount` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[product_code]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_code]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `product_code` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."products" DROP CONSTRAINT "products_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "public"."products" DROP CONSTRAINT "products_updatedBy_fkey";

-- DropIndex
DROP INDEX "public"."products_createdAt_idx";

-- DropIndex
DROP INDEX "public"."products_productCode_key";

-- DropIndex
DROP INDEX "public"."products_publishedAt_idx";

-- DropIndex
DROP INDEX "public"."products_status_publishedAt_idx";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "archivedAt",
DROP COLUMN "createdAt",
DROP COLUMN "createdBy",
DROP COLUMN "downloadUrl",
DROP COLUMN "durationDays",
DROP COLUMN "externalUrl",
DROP COLUMN "imageUrl",
DROP COLUMN "isFeatured",
DROP COLUMN "isRecommended",
DROP COLUMN "maxUsers",
DROP COLUMN "originalPrice",
DROP COLUMN "productCode",
DROP COLUMN "publishedAt",
DROP COLUMN "reviewCount",
DROP COLUMN "salesCount",
DROP COLUMN "shortDescription",
DROP COLUMN "sortOrder",
DROP COLUMN "updatedAt",
DROP COLUMN "updatedBy",
DROP COLUMN "videoUrl",
DROP COLUMN "viewCount",
ADD COLUMN     "archived_at" TIMESTAMPTZ(6),
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "download_url" TEXT,
ADD COLUMN     "duration_days" INTEGER,
ADD COLUMN     "external_url" TEXT,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_recommended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_users" INTEGER,
ADD COLUMN     "original_price" INTEGER,
ADD COLUMN     "product_code" TEXT NOT NULL,
ADD COLUMN     "published_at" TIMESTAMPTZ(6),
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sales_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "short_description" TEXT,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "updated_by" TEXT,
ADD COLUMN     "video_url" TEXT,
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "products_product_code_key" ON "products"("product_code");

-- CreateIndex
CREATE INDEX "idx_product_created_at" ON "products"("created_at");

-- CreateIndex
CREATE INDEX "idx_product_published_at" ON "products"("published_at");

-- CreateIndex
CREATE INDEX "idx_product_status_published_at" ON "products"("status", "published_at");

-- CreateIndex
CREATE INDEX "idx_product_created_by" ON "products"("created_by");

-- CreateIndex
CREATE INDEX "idx_product_updated_by" ON "products"("updated_by");

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_product_code" ON "products"("product_code");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "products_category_idx" RENAME TO "idx_product_category";

-- RenameIndex
ALTER INDEX "products_category_status_idx" RENAME TO "idx_product_category_status";

-- RenameIndex
ALTER INDEX "products_status_idx" RENAME TO "idx_product_status";
