/*
  Warnings:

  - A unique constraint covering the columns `[org_id,code]` on the table `depts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[org_id,code]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `org_id` to the `member_departments` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."depts_org_id_idx";

-- AlterTable
ALTER TABLE "member_departments" ADD COLUMN     "org_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "org_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "depts_org_id_code_key" ON "depts"("org_id", "code");

-- CreateIndex
CREATE INDEX "member_departments_org_id_idx" ON "member_departments"("org_id");

-- CreateIndex
CREATE INDEX "member_departments_org_id_member_id_idx" ON "member_departments"("org_id", "member_id");

-- CreateIndex
CREATE INDEX "member_departments_org_id_dept_id_idx" ON "member_departments"("org_id", "dept_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_org_id_code_key" ON "roles"("org_id", "code");

-- AddForeignKey
ALTER TABLE "member_departments" ADD CONSTRAINT "member_departments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
