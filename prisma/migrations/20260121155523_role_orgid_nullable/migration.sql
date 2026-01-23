/*
  Warnings:

  - Made the column `org_id` on table `roles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "org_id" SET NOT NULL;
