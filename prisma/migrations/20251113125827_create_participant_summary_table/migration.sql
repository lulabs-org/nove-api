-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('ONCE', 'CRON');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateTable
CREATE TABLE "participant_summaries" (
    "id" TEXT NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "recordFile" VARCHAR(500) NOT NULL,
    "meetParticipant" VARCHAR(100) NOT NULL,
    "participantSummary" TEXT NOT NULL,
    "recordFileId" VARCHAR(100) NOT NULL,
    "meetStartTime" TIMESTAMP(3) NOT NULL,
    "meetingSummary" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participant_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledTask" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobId" TEXT,
    "repeatKey" TEXT,
    "cron" TEXT,
    "runAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participant_summaries_platformUserId_idx" ON "participant_summaries"("platformUserId");

-- CreateIndex
CREATE INDEX "participant_summaries_recordFileId_idx" ON "participant_summaries"("recordFileId");

-- CreateIndex
CREATE INDEX "participant_summaries_meetStartTime_idx" ON "participant_summaries"("meetStartTime");

-- CreateIndex
CREATE INDEX "participant_summaries_createdAt_idx" ON "participant_summaries"("createdAt");

-- CreateIndex
CREATE INDEX "participant_summaries_deletedAt_idx" ON "participant_summaries"("deletedAt");

-- CreateIndex
CREATE INDEX "ScheduledTask_queueName_idx" ON "ScheduledTask"("queueName");

-- CreateIndex
CREATE INDEX "ScheduledTask_type_idx" ON "ScheduledTask"("type");

-- CreateIndex
CREATE INDEX "ScheduledTask_status_idx" ON "ScheduledTask"("status");

-- AddForeignKey
ALTER TABLE "participant_summaries" ADD CONSTRAINT "participant_summaries_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "PlatformUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
