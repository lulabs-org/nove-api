-- AlterTable
ALTER TABLE "depts" ADD COLUMN "leader_user_id" TEXT;

-- CreateIndex
CREATE INDEX "depts_leader_user_id_idx" ON "depts"("leader_user_id");

-- AddForeignKey
ALTER TABLE "depts" ADD CONSTRAINT "depts_leader_user_id_fkey" FOREIGN KEY ("leader_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
