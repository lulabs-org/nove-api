-- CreateEnum
CREATE TYPE "IdentityDocumentType" AS ENUM ('ID_CARD', 'PASSPORT', 'HOUSEHOLD_REGISTER', 'HK_MACAO_PERMIT', 'TAIWAN_PERMIT', 'FOREIGN_PERMANENT_RESIDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentVerifyStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "user_identity_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document_type" "IdentityDocumentType" NOT NULL,
    "issuing_country" VARCHAR(3) NOT NULL DEFAULT 'CHN',
    "holder_name" VARCHAR(100) NOT NULL,
    "number_cipher" VARCHAR(500) NOT NULL,
    "number_hash" VARCHAR(64) NOT NULL,
    "masked_number" VARCHAR(50) NOT NULL,
    "issue_date" DATE,
    "expiry_date" DATE,
    "is_permanent" BOOLEAN NOT NULL DEFAULT false,
    "issuing_authority" VARCHAR(100),
    "front_file_id" UUID,
    "back_file_id" UUID,
    "metadata" JSONB,
    "status" "DocumentVerifyStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "reject_reason" VARCHAR(255),
    "verified_at" TIMESTAMPTZ(6),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_identity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_user_docs_user_id" ON "user_identity_documents"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_docs_number_hash" ON "user_identity_documents"("number_hash");

-- CreateIndex
CREATE INDEX "idx_user_docs_status" ON "user_identity_documents"("status");

-- CreateIndex
CREATE INDEX "idx_user_docs_user_primary" ON "user_identity_documents"("user_id", "is_primary");

-- CreateIndex
CREATE INDEX "idx_user_docs_deleted_at" ON "user_identity_documents"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_identity_documents_issuing_country_document_type_numbe_key" ON "user_identity_documents"("issuing_country", "document_type", "number_hash");

-- AddForeignKey
ALTER TABLE "user_identity_documents" ADD CONSTRAINT "user_identity_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_identity_documents" ADD CONSTRAINT "user_identity_documents_front_file_id_fkey" FOREIGN KEY ("front_file_id") REFERENCES "storage_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_identity_documents" ADD CONSTRAINT "user_identity_documents_back_file_id_fkey" FOREIGN KEY ("back_file_id") REFERENCES "storage_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
