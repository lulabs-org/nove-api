/*
  Warnings:

  - You are about to drop the column `dateOfBirth` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to alter the column `avatar` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `bio` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `firstName` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `lastName` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `address` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `city` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `country` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `website` on the `user_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the column `countryCode` on the `users` table. All the data in the column will be lost.
  - You are about to alter the column `phone` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to drop the `UserPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserSettings` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `user_profiles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[country_code,phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `user_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."UserPreference" DROP CONSTRAINT "UserPreference_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserSettings" DROP CONSTRAINT "UserSettings_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_profiles" DROP CONSTRAINT "user_profiles_userId_fkey";

-- DropIndex
DROP INDEX "public"."user_profiles_userId_idx";

-- DropIndex
DROP INDEX "public"."user_profiles_userId_key";

-- DropIndex
DROP INDEX "public"."users_countryCode_phone_key";

-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "dateOfBirth",
DROP COLUMN "name",
DROP COLUMN "userId",
DROP COLUMN "zipCode",
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "display_name" VARCHAR(100),
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD COLUMN     "zip_code" VARCHAR(20),
ALTER COLUMN "avatar" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "bio" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "firstName" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "lastName" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "address" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "city" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "country" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "website" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "countryCode",
ADD COLUMN     "country_code" VARCHAR(10),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20);

-- DropTable
DROP TABLE "public"."UserPreference";

-- DropTable
DROP TABLE "public"."UserSettings";

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "language" VARCHAR(50) NOT NULL DEFAULT 'zh-CN',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Shanghai',
    "theme" VARCHAR(20) NOT NULL DEFAULT 'light',
    "email_notification" BOOLEAN NOT NULL DEFAULT true,
    "sms_notification" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_preference_user_id" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_settings_user_id" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_settings_language" ON "user_settings"("language");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_profile_user_id" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_profile_date_of_birth" ON "user_profiles"("date_of_birth");

-- CreateIndex
CREATE INDEX "idx_user_profile_gender" ON "user_profiles"("gender");

-- CreateIndex
CREATE INDEX "idx_user_profile_country" ON "user_profiles"("country");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_updated_at_idx" ON "users"("updated_at");

-- CreateIndex
CREATE INDEX "users_email_active_idx" ON "users"("email", "active");

-- CreateIndex
CREATE INDEX "users_username_active_idx" ON "users"("username", "active");

-- CreateIndex
CREATE INDEX "users_active_deleted_at_last_login_at_idx" ON "users"("active", "deleted_at", "last_login_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_country_code_phone_key" ON "users"("country_code", "phone");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
