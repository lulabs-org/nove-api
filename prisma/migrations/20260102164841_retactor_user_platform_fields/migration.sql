/*
  Warnings:

  - You are about to drop the column `avatar` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `external_id` on the `user_platforms` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `user_platforms` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."user_platforms" DROP CONSTRAINT "user_platforms_user_id_fkey";

-- DropIndex
DROP INDEX "public"."idx_user_platforms_is_active";

-- DropIndex
DROP INDEX "public"."idx_user_platforms_user_id";

-- DropIndex
DROP INDEX "public"."idx_user_platforms_user_name";

-- AlterTable
ALTER TABLE "user_platforms" DROP COLUMN "avatar",
DROP COLUMN "external_id",
DROP COLUMN "user_id",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "local_user_id" TEXT,
ADD COLUMN     "pt_org_id" TEXT,
ADD COLUMN     "pt_union_id" TEXT,
ADD COLUMN     "pt_user_id" TEXT;

-- CreateIndex
CREATE INDEX "idx_user_platforms_local_user_id" ON "user_platforms"("local_user_id");

-- CreateIndex
CREATE INDEX "idx_user_platforms_display_name" ON "user_platforms"("display_name");

-- CreateIndex
CREATE INDEX "idx_user_platforms_active" ON "user_platforms"("active");

-- AddForeignKey
ALTER TABLE "user_platforms" ADD CONSTRAINT "user_platforms_local_user_id_fkey" FOREIGN KEY ("local_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
