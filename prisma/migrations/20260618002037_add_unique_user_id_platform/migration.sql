/*
  Warnings:

  - A unique constraint covering the columns `[user_id,platform]` on the table `user_phone_hashes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_phone_hashes_user_id_platform_key" ON "user_phone_hashes"("user_id", "platform");
