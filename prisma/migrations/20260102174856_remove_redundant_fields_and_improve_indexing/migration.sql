/*
  Warnings:

  - You are about to drop the column `is_active` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `platform_user_id` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `platform_uuid` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `user_name` on the `user_platforms` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[platform,pt_union_id]` on the table `user_platforms` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."idx_user_platforms_active";

-- DropIndex
DROP INDEX "public"."idx_user_platforms_display_name";

-- DropIndex
DROP INDEX "public"."idx_user_platforms_email";

-- DropIndex
DROP INDEX "public"."idx_user_platforms_last_seen_at";

-- DropIndex
DROP INDEX "public"."idx_user_platforms_local_user_id";

-- DropIndex
DROP INDEX "public"."idx_user_platforms_phone_hash";

-- DropIndex
DROP INDEX "public"."idx_user_platforms_platform";

-- DropIndex
DROP INDEX "public"."idx_user_platforms_platform_uuid";

-- AlterTable
ALTER TABLE "user_platforms" DROP COLUMN "is_active",
DROP COLUMN "platform_user_id",
DROP COLUMN "platform_uuid",
DROP COLUMN "user_name";

-- CreateIndex
CREATE INDEX "idx_email_platform" ON "user_platforms"("email", "platform");

-- CreateIndex
CREATE INDEX "idx_local_user_active" ON "user_platforms"("local_user_id", "active");

-- CreateIndex
CREATE INDEX "idx_phone_platform" ON "user_platforms"("phone_hash", "platform");

-- CreateIndex
CREATE INDEX "idx_platform_active" ON "user_platforms"("platform", "active");

-- CreateIndex
CREATE UNIQUE INDEX "user_platforms_platform_pt_union_id_key" ON "user_platforms"("platform", "pt_union_id");
