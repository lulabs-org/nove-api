-- CreateEnum
CREATE TYPE "UserSecurityAuditEventType" AS ENUM ('EMAIL_BOUND', 'EMAIL_CHANGED', 'PHONE_BOUND', 'PHONE_CHANGED');
CREATE TYPE "SecurityNotificationChannel" AS ENUM ('EMAIL', 'PHONE');
CREATE TYPE "SecurityNotificationRecipient" AS ENUM ('OLD', 'NEW');
CREATE TYPE "SecurityNotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "user_security_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" "UserSecurityAuditEventType" NOT NULL,
    "old_value_encrypted" TEXT,
    "new_value_encrypted" TEXT NOT NULL,
    "old_value_masked" TEXT,
    "new_value_masked" TEXT NOT NULL,
    "verification_method" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "user_agent" TEXT,
    "device_id" TEXT,
    "encryption_key_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_security_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_notification_outbox" (
    "id" TEXT NOT NULL,
    "audit_log_id" TEXT NOT NULL,
    "channel" "SecurityNotificationChannel" NOT NULL,
    "recipient" "SecurityNotificationRecipient" NOT NULL,
    "status" "SecurityNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "security_notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_security_audit_logs_user_id_created_at_idx" ON "user_security_audit_logs"("user_id", "created_at");
CREATE INDEX "user_security_audit_logs_event_type_created_at_idx" ON "user_security_audit_logs"("event_type", "created_at");
CREATE UNIQUE INDEX "security_notification_outbox_audit_log_id_recipient_key" ON "security_notification_outbox"("audit_log_id", "recipient");
CREATE INDEX "security_notification_outbox_status_next_attempt_at_idx" ON "security_notification_outbox"("status", "next_attempt_at");
CREATE INDEX "security_notification_outbox_claimed_at_idx" ON "security_notification_outbox"("claimed_at");

-- AddForeignKey
ALTER TABLE "user_security_audit_logs" ADD CONSTRAINT "user_security_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "security_notification_outbox" ADD CONSTRAINT "security_notification_outbox_audit_log_id_fkey" FOREIGN KEY ("audit_log_id") REFERENCES "user_security_audit_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
