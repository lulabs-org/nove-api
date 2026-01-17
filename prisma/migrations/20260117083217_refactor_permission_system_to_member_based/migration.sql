/*
  Warnings:

  - You are about to drop the column `organization_id` on the `api_key_usage_logs` table. All the data in the column will be lost.
  - You are about to drop the column `organization_id` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `channelId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `currentOwnerId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `customerEmail` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhoneCode` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `externalOrderId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `financialClosed` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `financialClosedAt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `financialCloserId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `orderCode` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `orderNumber` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `role_data_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `role_data_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `ruleId` on the `role_data_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `role_data_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `role_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `permissionId` on the `role_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `role_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `role_permissions` table. All the data in the column will be lost.
  - You are about to drop the `departments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organizations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_data_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_departments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_organizations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[order_code]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_number]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[role_id,rule_id]` on the table `role_data_permissions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[role_id,permission_id]` on the table `role_permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `org_id` to the `api_key_usage_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `org_id` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_code` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_number` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `role_data_permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rule_id` to the `role_data_permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `role_data_permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `permission_id` to the `role_permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `role_permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `role_permissions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT');

-- DropForeignKey
ALTER TABLE "public"."api_key_usage_logs" DROP CONSTRAINT "api_key_usage_logs_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."api_keys" DROP CONSTRAINT "api_keys_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_org_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_channelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_currentOwnerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_financialCloserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."organizations" DROP CONSTRAINT "organizations_parentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."role_data_permissions" DROP CONSTRAINT "role_data_permissions_roleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."role_data_permissions" DROP CONSTRAINT "role_data_permissions_ruleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."role_permissions" DROP CONSTRAINT "role_permissions_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."role_permissions" DROP CONSTRAINT "role_permissions_roleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_data_permissions" DROP CONSTRAINT "user_data_permissions_ruleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_data_permissions" DROP CONSTRAINT "user_data_permissions_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_departments" DROP CONSTRAINT "user_departments_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_departments" DROP CONSTRAINT "user_departments_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_organizations" DROP CONSTRAINT "user_organizations_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_organizations" DROP CONSTRAINT "user_organizations_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_permissions" DROP CONSTRAINT "user_permissions_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_permissions" DROP CONSTRAINT "user_permissions_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_roles" DROP CONSTRAINT "user_roles_roleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_roles" DROP CONSTRAINT "user_roles_userId_fkey";

-- DropIndex
DROP INDEX "public"."api_key_usage_logs_organization_id_created_at_idx";

-- DropIndex
DROP INDEX "public"."api_keys_organization_id_created_at_idx";

-- DropIndex
DROP INDEX "public"."api_keys_organization_id_status_idx";

-- DropIndex
DROP INDEX "public"."orders_channelId_idx";

-- DropIndex
DROP INDEX "public"."orders_currentOwnerId_idx";

-- DropIndex
DROP INDEX "public"."orders_financialClosed_idx";

-- DropIndex
DROP INDEX "public"."orders_financialClosed_paidAt_idx";

-- DropIndex
DROP INDEX "public"."orders_orderCode_key";

-- DropIndex
DROP INDEX "public"."orders_orderNumber_key";

-- DropIndex
DROP INDEX "public"."orders_productId_idx";

-- DropIndex
DROP INDEX "public"."orders_userId_idx";

-- DropIndex
DROP INDEX "public"."orders_userId_paidAt_idx";

-- DropIndex
DROP INDEX "public"."role_data_permissions_roleId_idx";

-- DropIndex
DROP INDEX "public"."role_data_permissions_roleId_ruleId_key";

-- DropIndex
DROP INDEX "public"."role_data_permissions_ruleId_idx";

-- DropIndex
DROP INDEX "public"."role_permissions_permissionId_idx";

-- DropIndex
DROP INDEX "public"."role_permissions_roleId_idx";

-- DropIndex
DROP INDEX "public"."role_permissions_roleId_permissionId_key";

-- AlterTable
ALTER TABLE "api_key_usage_logs" DROP COLUMN "organization_id",
ADD COLUMN     "org_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "api_keys" DROP COLUMN "organization_id",
ADD COLUMN     "org_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "channelId",
DROP COLUMN "currentOwnerId",
DROP COLUMN "customerEmail",
DROP COLUMN "customerPhone",
DROP COLUMN "customerPhoneCode",
DROP COLUMN "externalOrderId",
DROP COLUMN "financialClosed",
DROP COLUMN "financialClosedAt",
DROP COLUMN "financialCloserId",
DROP COLUMN "orderCode",
DROP COLUMN "orderNumber",
DROP COLUMN "productId",
DROP COLUMN "productName",
DROP COLUMN "userId",
ADD COLUMN     "channel_id" INTEGER,
ADD COLUMN     "current_owner_id" TEXT,
ADD COLUMN     "customer_email" TEXT,
ADD COLUMN     "customer_phone" TEXT,
ADD COLUMN     "customer_phone_code" TEXT,
ADD COLUMN     "external_order_id" TEXT,
ADD COLUMN     "financial_closed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "financial_closed_at" TIMESTAMP(3),
ADD COLUMN     "financial_closer_id" TEXT,
ADD COLUMN     "order_code" TEXT NOT NULL,
ADD COLUMN     "order_number" TEXT NOT NULL,
ADD COLUMN     "product_id" TEXT,
ADD COLUMN     "product_name" TEXT,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "role_data_permissions" DROP COLUMN "createdAt",
DROP COLUMN "roleId",
DROP COLUMN "ruleId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "role_id" TEXT NOT NULL,
ADD COLUMN     "rule_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- AlterTable
ALTER TABLE "role_permissions" DROP COLUMN "createdAt",
DROP COLUMN "permissionId",
DROP COLUMN "roleId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "permission_id" TEXT NOT NULL,
ADD COLUMN     "role_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL;

-- DropTable
DROP TABLE "public"."departments";

-- DropTable
DROP TABLE "public"."organizations";

-- DropTable
DROP TABLE "public"."user_data_permissions";

-- DropTable
DROP TABLE "public"."user_departments";

-- DropTable
DROP TABLE "public"."user_organizations";

-- DropTable
DROP TABLE "public"."user_permissions";

-- DropTable
DROP TABLE "public"."user_roles";

-- CreateTable
CREATE TABLE "depts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "org_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "depts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orgs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "parent_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_members" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "MemberType" NOT NULL DEFAULT 'INTERNAL',
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "org_display_name" TEXT,
    "employee_no" TEXT,
    "primary_dept_id" TEXT,
    "external_company" TEXT,
    "title" TEXT,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "org_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_departments" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "dept_id" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "member_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_roles" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "member_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_permissions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "member_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_data_permissions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "member_data_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "depts_code_key" ON "depts"("code");

-- CreateIndex
CREATE INDEX "depts_org_id_idx" ON "depts"("org_id");

-- CreateIndex
CREATE INDEX "depts_parent_id_idx" ON "depts"("parent_id");

-- CreateIndex
CREATE INDEX "depts_code_idx" ON "depts"("code");

-- CreateIndex
CREATE INDEX "depts_org_id_active_idx" ON "depts"("org_id", "active");

-- CreateIndex
CREATE INDEX "depts_parent_id_sort_order_idx" ON "depts"("parent_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "orgs_code_key" ON "orgs"("code");

-- CreateIndex
CREATE INDEX "orgs_parent_id_idx" ON "orgs"("parent_id");

-- CreateIndex
CREATE INDEX "orgs_code_idx" ON "orgs"("code");

-- CreateIndex
CREATE INDEX "orgs_active_idx" ON "orgs"("active");

-- CreateIndex
CREATE INDEX "orgs_parent_id_sort_order_idx" ON "orgs"("parent_id", "sort_order");

-- CreateIndex
CREATE INDEX "org_members_org_id_idx" ON "org_members"("org_id");

-- CreateIndex
CREATE INDEX "org_members_user_id_idx" ON "org_members"("user_id");

-- CreateIndex
CREATE INDEX "org_members_org_id_type_status_idx" ON "org_members"("org_id", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "org_members_org_id_user_id_key" ON "org_members"("org_id", "user_id");

-- CreateIndex
CREATE INDEX "member_departments_member_id_idx" ON "member_departments"("member_id");

-- CreateIndex
CREATE INDEX "member_departments_dept_id_idx" ON "member_departments"("dept_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_departments_member_id_dept_id_key" ON "member_departments"("member_id", "dept_id");

-- CreateIndex
CREATE INDEX "member_roles_member_id_idx" ON "member_roles"("member_id");

-- CreateIndex
CREATE INDEX "member_roles_role_id_idx" ON "member_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_roles_member_id_role_id_key" ON "member_roles"("member_id", "role_id");

-- CreateIndex
CREATE INDEX "member_permissions_member_id_idx" ON "member_permissions"("member_id");

-- CreateIndex
CREATE INDEX "member_permissions_permission_id_idx" ON "member_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_permissions_member_id_permission_id_key" ON "member_permissions"("member_id", "permission_id");

-- CreateIndex
CREATE INDEX "member_data_permissions_member_id_idx" ON "member_data_permissions"("member_id");

-- CreateIndex
CREATE INDEX "member_data_permissions_rule_id_idx" ON "member_data_permissions"("rule_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_data_permissions_member_id_rule_id_key" ON "member_data_permissions"("member_id", "rule_id");

-- CreateIndex
CREATE INDEX "api_key_usage_logs_org_id_created_at_idx" ON "api_key_usage_logs"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "api_keys_org_id_status_idx" ON "api_keys"("org_id", "status");

-- CreateIndex
CREATE INDEX "api_keys_org_id_created_at_idx" ON "api_keys"("org_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_product_id_idx" ON "orders"("product_id");

-- CreateIndex
CREATE INDEX "orders_channel_id_idx" ON "orders"("channel_id");

-- CreateIndex
CREATE INDEX "orders_current_owner_id_idx" ON "orders"("current_owner_id");

-- CreateIndex
CREATE INDEX "orders_financial_closed_idx" ON "orders"("financial_closed");

-- CreateIndex
CREATE INDEX "orders_user_id_paidAt_idx" ON "orders"("user_id", "paidAt");

-- CreateIndex
CREATE INDEX "orders_financial_closed_paidAt_idx" ON "orders"("financial_closed", "paidAt");

-- CreateIndex
CREATE INDEX "role_data_permissions_role_id_idx" ON "role_data_permissions"("role_id");

-- CreateIndex
CREATE INDEX "role_data_permissions_rule_id_idx" ON "role_data_permissions"("rule_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_data_permissions_role_id_rule_id_key" ON "role_data_permissions"("role_id", "rule_id");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_usage_logs" ADD CONSTRAINT "api_key_usage_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depts" ADD CONSTRAINT "depts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depts" ADD CONSTRAINT "depts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "depts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_current_owner_id_fkey" FOREIGN KEY ("current_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_financial_closer_id_fkey" FOREIGN KEY ("financial_closer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orgs" ADD CONSTRAINT "orgs_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_primary_dept_id_fkey" FOREIGN KEY ("primary_dept_id") REFERENCES "depts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_departments" ADD CONSTRAINT "member_departments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "org_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_departments" ADD CONSTRAINT "member_departments_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "depts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "org_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_permissions" ADD CONSTRAINT "member_permissions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "org_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_permissions" ADD CONSTRAINT "member_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_data_permissions" ADD CONSTRAINT "role_data_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_data_permissions" ADD CONSTRAINT "role_data_permissions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "data_permission_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_data_permissions" ADD CONSTRAINT "member_data_permissions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "org_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_data_permissions" ADD CONSTRAINT "member_data_permissions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "data_permission_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
