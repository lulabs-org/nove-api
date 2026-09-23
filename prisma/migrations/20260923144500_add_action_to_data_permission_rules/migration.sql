-- AlterTable
ALTER TABLE "data_permission_rules" ADD COLUMN "action" TEXT NOT NULL DEFAULT '*';

-- CreateIndex
CREATE INDEX "data_permission_rules_resource_action_idx" ON "data_permission_rules"("resource", "action");
