/*
  Warnings:

  - You are about to drop the column `createdAt` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `organizations` table. All the data in the column will be lost.
  - Added the required column `org_id` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `organizations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_parentId_fkey";

-- DropIndex
DROP INDEX "public"."departments_organizationId_active_idx";

-- DropIndex
DROP INDEX "public"."departments_organizationId_idx";

-- DropIndex
DROP INDEX "public"."departments_parentId_idx";

-- DropIndex
DROP INDEX "public"."departments_parentId_sortOrder_idx";

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "createdAt",
DROP COLUMN "organizationId",
DROP COLUMN "parentId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "org_id" TEXT NOT NULL,
ADD COLUMN     "parent_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- CreateIndex
CREATE INDEX "departments_org_id_idx" ON "departments"("org_id");

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "departments"("parent_id");

-- CreateIndex
CREATE INDEX "departments_org_id_active_idx" ON "departments"("org_id", "active");

-- CreateIndex
CREATE INDEX "departments_parent_id_sortOrder_idx" ON "departments"("parent_id", "sortOrder");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
