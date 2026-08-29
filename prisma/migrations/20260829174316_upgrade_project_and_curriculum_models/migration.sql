/*
  Warnings:

  - The `level` column on the `projects` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[slug]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `curriculums` table without a default value. This is not possible if the table is not empty.
  - Made the column `project_id` on table `curriculums` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `curriculums` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_at` to the `projects` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CurriculumStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ENROLLING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('OWNER', 'INSTRUCTOR', 'MENTOR', 'STUDENT', 'AUDITOR');

-- DropIndex
DROP INDEX "public"."projects_slug_idx";

-- AlterTable
ALTER TABLE "curriculums" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "deliverables" JSONB,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "resources" JSONB,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "CurriculumStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "subtitle" VARCHAR(255),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ALTER COLUMN "project_id" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "title" SET DATA TYPE VARCHAR(150);

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "code" VARCHAR(50),
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "end_date" TIMESTAMPTZ(6),
ADD COLUMN     "enroll_deadline" TIMESTAMPTZ(6),
ADD COLUMN     "enrolled_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "org_id" TEXT,
ADD COLUMN     "owner_id" TEXT,
ADD COLUMN     "product_id" TEXT,
ADD COLUMN     "published_at" TIMESTAMPTZ(6),
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "start_date" TIMESTAMPTZ(6),
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "updated_by" TEXT,
ALTER COLUMN "title" SET DATA TYPE VARCHAR(150),
ALTER COLUMN "subtitle" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "image" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "duration" SET DATA TYPE VARCHAR(50),
DROP COLUMN "level",
ADD COLUMN     "level" "ProjectLevel" NOT NULL DEFAULT 'BEGINNER',
ALTER COLUMN "slug" SET DATA TYPE VARCHAR(100);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'STUDENT',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_members_project_id_idx" ON "project_members"("project_id");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- CreateIndex
CREATE INDEX "project_members_deleted_at_idx" ON "project_members"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "curriculums_project_id_sort_order_idx" ON "curriculums"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "curriculums_deleted_at_idx" ON "curriculums"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_org_id_idx" ON "projects"("org_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_owner_id_idx" ON "projects"("owner_id");

-- CreateIndex
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at");

-- CreateIndex
CREATE INDEX "projects_org_id_status_idx" ON "projects"("org_id", "status");

-- CreateIndex
CREATE INDEX "projects_status_published_at_idx" ON "projects"("status", "published_at");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
