-- CreateEnum
CREATE TYPE "SkillStatus" AS ENUM ('ACTIVE', 'DISABLED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('MEETING', 'SPEAKER', 'TASK', 'REPORT', 'GENERAL');

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL DEFAULT 'GENERAL',
    "description" TEXT,
    "status" "SkillStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_versions" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "changelog" TEXT,
    "package_storage_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_code_key" ON "skills"("code");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- CreateIndex
CREATE INDEX "skills_status_idx" ON "skills"("status");

-- CreateIndex
CREATE INDEX "skill_versions_package_storage_id_idx" ON "skill_versions"("package_storage_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_versions_skill_id_version_key" ON "skill_versions"("skill_id", "version");

-- AddForeignKey
ALTER TABLE "skill_versions" ADD CONSTRAINT "skill_versions_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_versions" ADD CONSTRAINT "skill_versions_package_storage_id_fkey" FOREIGN KEY ("package_storage_id") REFERENCES "storage_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
